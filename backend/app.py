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
flows_lock = threading.Lock()

def process_packet(pkt):
    if not monitoring_active:
        return

    try:
        if not pkt.haslayer(IP):
            return

        is_tcp = pkt.haslayer(TCP)
        is_udp = pkt.haslayer(UDP)

        if not (is_tcp or is_udp):
            return

        src    = pkt[IP].src
        dst    = pkt[IP].dst
        length = len(pkt)
        ts     = float(pkt.time)

        if is_tcp:
            sport = pkt[TCP].sport
            dport = pkt[TCP].dport
        else:
            sport = pkt[UDP].sport
            dport = pkt[UDP].dport

        fwd_key = (src, sport, dst, dport)
        bwd_key = (dst, dport, src, sport)

        with flows_lock:
            if fwd_key in flows:
                key       = fwd_key
                direction = 'fwd'
            elif bwd_key in flows:
                key       = bwd_key
                direction = 'bwd'
            else:
                key       = fwd_key
                direction = 'fwd'
                flows[key] = {
                    'start_time'   : ts,
                    'last_time'    : ts,
                    'last_pkt_time': ts,
                    'last_fwd_time': ts,
                    'last_bwd_time': ts,
                    'fwd_pkts'     : 0,
                    'fwd_bytes'    : 0,
                    'bwd_pkts'     : 0,
                    'bwd_bytes'    : 0,
                    'fwd_pkt_lens' : [],
                    'bwd_pkt_lens' : [],
                    'fwd_iats'     : [],
                    'bwd_iats'     : [],
                    'flow_iats'    : [],
                    'init_fwd_win' : 0,
                    'init_bwd_win' : 0,
                    'pkt_lens'     : [],
                }

            flow = flows[key]
            iat  = ts - flow['last_pkt_time']
            flow['flow_iats'].append(iat)
            flow['last_pkt_time'] = ts
            flow['last_time']     = ts
            flow['pkt_lens'].append(length)

            if direction == 'fwd':
                flow['fwd_pkts']  += 1
                flow['fwd_bytes'] += length
                flow['fwd_pkt_lens'].append(length)
                flow['fwd_iats'].append(ts - flow['last_fwd_time'])
                flow['last_fwd_time'] = ts
                if is_tcp and flow['fwd_pkts'] == 1:
                    flow['init_fwd_win'] = pkt[TCP].window
            else:
                flow['bwd_pkts']  += 1
                flow['bwd_bytes'] += length
                flow['bwd_pkt_lens'].append(length)
                flow['bwd_iats'].append(ts - flow['last_bwd_time'])
                flow['last_bwd_time'] = ts
                if is_tcp and flow['bwd_pkts'] == 1:
                    flow['init_bwd_win'] = pkt[TCP].window

    except Exception as e:
        print(f"Packet processing error: {e}")


def sniff_traffic():
    while True:  # ✅ crash වුණොත් restart
        try:
            print("Starting packet capture on eth0...")
            sniff(
                iface="eth0",
                prn=process_packet,
                store=False,
                filter="tcp or udp"
            )
        except Exception as e:
            print(f"Sniffing error: {e} - Restarting in 2s...")
            time.sleep(2)

def extract_features(flow, dst_port):
    """Flow එකෙන් model features හදනවා"""
    duration    = max(flow['last_time'] - flow['start_time'], 0.000001)
    fwd_pkts    = flow['fwd_pkts']
    bwd_pkts    = flow['bwd_pkts']
    fwd_bytes   = flow['fwd_bytes']
    bwd_bytes   = flow['bwd_bytes']
    total_pkts  = fwd_pkts + bwd_pkts
    total_bytes = fwd_bytes + bwd_bytes
    all_lens    = flow['pkt_lens']
    bwd_lens    = flow['bwd_pkt_lens']
    fwd_lens    = flow['fwd_pkt_lens']
    flow_iats   = flow['flow_iats']
    bwd_iats    = flow['bwd_iats']

    import numpy as np

    def safe_mean(lst):
        return float(np.mean(lst)) if lst else 0.0

    def safe_max(lst):
        return float(np.max(lst)) if lst else 0.0

    def safe_var(lst):
        return float(np.var(lst)) if lst else 0.0

    features = {
        'Dst Port'         : float(dst_port),
        'Flow Byts/s'      : float(total_bytes / duration),
        'Bwd Pkt Len Mean' : safe_mean(bwd_lens),
        'Fwd Pkt Len Max'  : safe_max(fwd_lens),
        'Bwd Pkt Len Max'  : safe_max(bwd_lens),
        'Pkt Len Mean'     : safe_mean(all_lens),
        'Init Fwd Win Byts': float(flow['init_fwd_win']),
        'Pkt Len Var'      : safe_var(all_lens),
        'Flow Pkts/s'      : float(total_pkts / duration),
        'Flow Duration'    : duration * 1000000,
        'Flow IAT Max'     : safe_max(flow_iats),
        'Bwd Pkts/s'       : float(bwd_pkts / duration),
        'Tot Fwd Pkts'     : float(fwd_pkts),
        'Flow IAT Mean'    : safe_mean(flow_iats),
        'Fwd Seg Size Min' : float(min(fwd_lens)) if fwd_lens else 0.0,
        'Tot Bwd Pkts'     : float(bwd_pkts),
        'Init Bwd Win Byts': float(flow['init_bwd_win']),
        'Bwd IAT Tot'      : float(sum(bwd_iats)),
        'Bwd IAT Max'      : safe_max(bwd_iats),
        'Bwd IAT Mean'     : safe_mean(bwd_iats),
    }

    return features


def sniff_traffic():
    global monitoring_active
    try:
        # Filter can be adapted, right now sniffs IP packets
        print("Starting packet capture on eth0...")
        sniff( iface="eth0",     
            prn=process_packet,
            store=False,
            filter="ip"   )
    except Exception as e:
        print(f"Sniffing error: {e}")

def analyze_flows():
    global flows, realtime_data, monitoring_active

    while True:
        time.sleep(3)  # 3 second window

        if not monitoring_active or not model:
            continue

        with flows_lock:
            if not flows:
                continue

            snapshot = dict(flows)
            flows.clear()

        # සියලු flows analyze කරනවා
        for flow_key, flow in snapshot.items():
            try:
                if flow['fwd_pkts'] < 2:
                    continue

                dst_port = flow_key[3]
                features = extract_features(flow, dst_port)

                print(f"Analyzing flow: {flow_key[0]}:{flow_key[1]} -> "f"{flow_key[2]}:{flow_key[3]} | "f"fwd:{flow['fwd_pkts']} bwd:{flow['bwd_pkts']}")

                df = pd.DataFrame([features])
                df_scaled  = scaler.transform(df)
                prediction = model.predict(df_scaled)[0]
                risk_level = "BENIGN" if prediction == 0 else "ATTACK"
                
                print(f"Prediction: {risk_level}")

                new_entry = {
                    "time"         : datetime.now().strftime("%H:%M:%S"),
                    "dst_port"     : dst_port,
                    "flow_duration": round(flow['last_time'] - flow['start_time'], 4),
                    "fwd_pkts"     : flow['fwd_pkts'],
                    "bwd_pkts"     : flow['bwd_pkts'],
                    "risk_level"   : risk_level,
                    "prediction"   : int(prediction)
                }
            

                realtime_data.append(new_entry)
                if len(realtime_data) > 50:
                    realtime_data.pop(0)

                if risk_level == "ATTACK":
                    print(f"ATTACK detected! Port: {dst_port}, "f"Pkts: {flow['fwd_pkts']}, Features: {features}")

            except Exception as e:
                print(f"Flow analysis error: {e}")

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
    app.run(host="0.0.0.0", port=5000, debug=True)
