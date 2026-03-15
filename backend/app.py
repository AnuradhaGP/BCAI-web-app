from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import MinMaxScaler
##
import time
import random
import threading
from collections import defaultdict
from scapy.all import sniff, IP, TCP, UDP
##


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'model_RandomForest.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'model', 'scaler.pkl')

model = None
scaler = None

if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print("Model loaded successfully.")
else:
    print(f"Model not found at {MODEL_PATH}")

feature_names = [
            'Dst Port', 'Flow Byts/s', 'Bwd Pkt Len Mean', 'Fwd Pkt Len Max',
            'Bwd Pkt Len Max', 'Pkt Len Mean', 'Init Fwd Win Byts', 'Pkt Len Var',
            'Flow Pkts/s', 'Flow Duration', 'Flow IAT Max', 'Bwd Pkts/s',
            'Tot Fwd Pkts', 'Flow IAT Mean', 'Fwd Seg Size Min', 'Tot Bwd Pkts',
            'Init Bwd Win Byts', 'Bwd IAT Tot', 'Bwd IAT Max', 'Bwd IAT Mean'
        ]



@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model_loaded": model is not None})

@app.route('/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({"error": "Model not active"}), 503

    try:
        data = request.get_json()
        features = {name: float(data.get(name) or 0) for name in feature_names}
        df = pd.DataFrame([features])
        df = scaler.transform(df)

        prediction = model.predict(df)[0]
        risk_level = "LOW" if prediction == 0 else "HIGH"
        
        return jsonify({
            "prediction": int(prediction),
            "risk_level": risk_level
        })
    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        return jsonify({"error": str(e)}), 400

# ----- REAL-TIME MONITORING LOGIC -----
monitoring_active = False
realtime_data = []  # Maximum 50 items
flows = {}

def process_packet(pkt):
    if not monitoring_active:
        return

    if pkt.haslayer(IP) and (pkt.haslayer(TCP) or pkt.haslayer(UDP)):
        src = pkt[IP].src
        dst = pkt[IP].dst
        sport = pkt[TCP].sport if pkt.haslayer(TCP) else pkt[UDP].sport
        dport = pkt[TCP].dport if pkt.haslayer(TCP) else pkt[UDP].dport
        length = len(pkt)
        time_sec = float(pkt.time)
        
        flow_key = (src, sport, dst, dport)
        if flow_key not in flows:
            flows[flow_key] = {
                'start_time': time_sec,
                'last_time': time_sec,
                'fwd_pkts': 0,
                'fwd_bytes': 0,
            }
        
        flows[flow_key]['fwd_pkts'] += 1
        flows[flow_key]['fwd_bytes'] += length
        flows[flow_key]['last_time'] = time_sec

def sniff_traffic():
    global monitoring_active
    try:
        # Filter can be adapted, right now sniffs IP packets
        sniff(prn=process_packet, store=False)
    except Exception as e:
        print(f"Sniffing error: {e}")

def analyze_flows():
    global flows, realtime_data, monitoring_active
    while True:
        if monitoring_active and len(flows) > 0 and model:
            try:
                # Find the flow with the most packets in this window
                largest_flow_key = max(flows.keys(), key=lambda k: flows[k]['fwd_pkts'])
                flow = flows[largest_flow_key]
                
                duration = max(flow['last_time'] - flow['start_time'], 0.001)
                fwd_pkts = flow['fwd_pkts']
                fwd_bytes = flow['fwd_bytes']
                dst_port = largest_flow_key[3]
                
                # Approximate 20 features
                features = {name: 0.0 for name in feature_names}
                features['Dst Port'] = float(dst_port)
                features['Flow Duration'] = duration * 1000000 
                features['Tot Fwd Pkts'] = float(fwd_pkts)
                features['Flow Byts/s'] = float(fwd_bytes / duration)
                features['Flow Pkts/s'] = float(fwd_pkts / duration)
                features['Pkt Len Mean'] = float(fwd_bytes / fwd_pkts if fwd_pkts > 0 else 0)
                
                df = pd.DataFrame([features])
                df_scaled = scaler.transform(df)
                prediction = model.predict(df_scaled)[0]
                risk_level = "BENIGN" if prediction == 0 else "ATTACK"
                
                from datetime import datetime
                new_entry = {
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "dst_port": dst_port,
                    "flow_duration": round(duration, 4),
                    "fwd_pkts": fwd_pkts,
                    "risk_level": risk_level,
                    "prediction": int(prediction)
                }
                
                realtime_data.append(new_entry)
                if len(realtime_data) > 50:
                    realtime_data.pop(0)
                
            except Exception as e:
                print(f"Analysis error: {e}")
            
            # Clear flows for the next window
            flows.clear()
        time.sleep(2)

threading.Thread(target=analyze_flows, daemon=True).start()

# For a real application, you might want to start/stop the sniffer thread more carefully, but here we let it run and just toggle a boolean.
# Scapy sniff might block, so we run it in a daemon thread. However, it's safer to just set the boolean to ignore packets.
threading.Thread(target=sniff_traffic, daemon=True).start()

@app.route('/api/monitoring/status', methods=['GET'])
def get_monitoring_status():
    return jsonify({"monitoring_active": monitoring_active})

@app.route('/api/monitoring/toggle', methods=['POST'])
def toggle_monitoring():
    global monitoring_active, realtime_data, flows
    data = request.get_json()
    monitoring_active = data.get("active", False)
    if monitoring_active:
        realtime_data.clear()
        flows.clear()
    return jsonify({"monitoring_active": monitoring_active})

@app.route('/api/monitoring/data', methods=['GET'])
def get_monitoring_data():
    return jsonify({"data": realtime_data})

if __name__ == '__main__':
    app.run(host="http://206.189.128.176/", port=5000, debug=True)
