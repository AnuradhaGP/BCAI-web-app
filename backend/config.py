import os

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'model_RandomForest.pkl')
SCALER_PATH= os.path.join(BASE_DIR, 'model', 'scaler.pkl')

FEATURE_NAMES = [
    'Dst Port', 'Flow Byts/s', 'Bwd Pkt Len Mean', 'Fwd Pkt Len Max',
    'Bwd Pkt Len Max', 'Pkt Len Mean', 'Init Fwd Win Byts', 'Pkt Len Var',
    'Flow Pkts/s', 'Flow Duration', 'Flow IAT Max', 'Bwd Pkts/s',
    'Tot Fwd Pkts', 'Flow IAT Mean', 'Fwd Seg Size Min', 'Tot Bwd Pkts',
    'Init Bwd Win Byts', 'Bwd IAT Tot', 'Bwd IAT Max', 'Bwd IAT Mean'
]

CAPTURE_INTERFACE  = 'eth0'
FLOW_WINDOW_SECS   = 3
MAX_REALTIME_ITEMS = 50
MIN_PKTS_TO_ANALYZE= 2

JENKINS_URL       = "http://206.189.128.176:8080"
JENKINS_USER      = "aremis"
JENKINS_API_TOKEN = "11ce4856c63f3539a1a6c2f9a1c2112e88"
JENKINS_JOB_NAME  = "Demo-project"