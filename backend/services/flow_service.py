import numpy as np
import threading
import time
from datetime import datetime
from config import FLOW_WINDOW_SECS, MAX_REALTIME_ITEMS, MIN_PKTS_TO_ANALYZE
from services.jenkins_service import jenkins_service
import threading
class FlowService:
    def __init__(self):
        self.flows        = {}
        self.lock         = threading.Lock()
        self.realtime_data= []
        self.active       = False
        self._model_svc   = None
        self._socketio    = None
        self._attack_count  = 0
        self._attack_threshold = 3 
        self._last_attack_reset = time.time()

    def init(self, model_service, socketio):
        self._model_svc = model_service
        self._socketio  = socketio
        threading.Thread(target=self._analyze_loop, daemon=True).start()

    # Packet handler 
    def process_packet(self, src, dst, sport, dport,
                       length, ts, is_tcp, win=0):
        fwd_key = (src, sport, dst, dport)
        bwd_key = (dst, dport, src, sport)

        with self.lock:
            if fwd_key in self.flows:
                key, direction = fwd_key, 'fwd'
            elif bwd_key in self.flows:
                key, direction = bwd_key, 'bwd'
            else:
                key, direction = fwd_key, 'fwd'
                self.flows[key] = self._new_flow(ts)

            flow = self.flows[key]
            self._update_flow(flow, direction, ts, length, is_tcp, win)

    def _new_flow(self, ts):
        return {
            'start_time'   : ts, 'last_time'    : ts,
            'last_pkt_time': ts, 'last_fwd_time': ts,
            'last_bwd_time': ts,
            'fwd_pkts'     : 0,  'fwd_bytes'    : 0,
            'bwd_pkts'     : 0,  'bwd_bytes'    : 0,
            'fwd_pkt_lens' : [], 'bwd_pkt_lens' : [],
            'fwd_iats'     : [], 'bwd_iats'     : [],
            'flow_iats'    : [], 'pkt_lens'      : [],
            'init_fwd_win' : 0,  'init_bwd_win'  : 0,
        }

    def _update_flow(self, flow, direction, ts, length, is_tcp, win):
        iat = ts - flow['last_pkt_time']
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
                flow['init_fwd_win'] = win
        else:
            flow['bwd_pkts']  += 1
            flow['bwd_bytes'] += length
            flow['bwd_pkt_lens'].append(length)
            flow['bwd_iats'].append(ts - flow['last_bwd_time'])
            flow['last_bwd_time'] = ts
            if is_tcp and flow['bwd_pkts'] == 1:
                flow['init_bwd_win'] = win

    # Feature extraction 
    def extract_features(self, flow, dst_port) -> dict:
        duration    = max(flow['last_time'] - flow['start_time'], 1e-6)
        total_pkts  = flow['fwd_pkts'] + flow['bwd_pkts']
        total_bytes = flow['fwd_bytes'] + flow['bwd_bytes']

        def mean(lst): return float(np.mean(lst)) if lst else 0.0
        def maxx(lst): return float(np.max(lst))  if lst else 0.0
        def minn(lst): return float(np.min(lst))  if lst else 0.0
        def varr(lst): return float(np.var(lst))  if lst else 0.0
        def summ(lst): return float(sum(lst))      if lst else 0.0

        return {
            'Dst Port'         : float(dst_port),
            'Flow Byts/s'      : total_bytes / duration,
            'Bwd Pkt Len Mean' : mean(flow['bwd_pkt_lens']),
            'Fwd Pkt Len Max'  : maxx(flow['fwd_pkt_lens']),
            'Bwd Pkt Len Max'  : maxx(flow['bwd_pkt_lens']),
            'Pkt Len Mean'     : mean(flow['pkt_lens']),
            'Init Fwd Win Byts': float(flow['init_fwd_win']),
            'Pkt Len Var'      : varr(flow['pkt_lens']),
            'Flow Pkts/s'      : total_pkts / duration,
            'Flow Duration'    : duration * 1_000_000,
            'Flow IAT Max'     : maxx(flow['flow_iats']),
            'Bwd Pkts/s'       : flow['bwd_pkts'] / duration,
            'Tot Fwd Pkts'     : float(flow['fwd_pkts']),
            'Flow IAT Mean'    : mean(flow['flow_iats']),
            'Fwd Seg Size Min' : minn(flow['fwd_pkt_lens']),
            'Tot Bwd Pkts'     : float(flow['bwd_pkts']),
            'Init Bwd Win Byts': float(flow['init_bwd_win']),
            'Bwd IAT Tot'      : summ(flow['bwd_iats']),
            'Bwd IAT Max'      : maxx(flow['bwd_iats']),
            'Bwd IAT Mean'     : mean(flow['bwd_iats']),
        }

    #Analysis loop
    def _analyze_loop(self):
        while True:
            time.sleep(FLOW_WINDOW_SECS)

            if not self.active or not self._model_svc:
                continue

            with self.lock:
                if not self.flows:
                    continue
                snapshot = dict(self.flows)
                self.flows.clear()

            for flow_key, flow in snapshot.items():
                try:
                    if flow['fwd_pkts'] < MIN_PKTS_TO_ANALYZE:
                        continue

                    dst_port = flow_key[3]

                    features = self.extract_features(flow, dst_port)
                    result   = self._model_svc.predict_flow(features)

                    print(f"{flow_key[0]}:{flow_key[1]} → "
                          f"{flow_key[2]}:{dst_port} | "
                          f"fwd:{flow['fwd_pkts']} "
                          f"bwd:{flow['bwd_pkts']} | "
                          f"{result['risk_level']}")

                    entry = {
                        "time"         : datetime.now().strftime("%H:%M:%S"),
                        "src_ip"       : flow_key[0],
                        "dst_port"     : dst_port,
                        "flow_duration": round(flow['last_time'] - flow['start_time'], 4),
                        "fwd_pkts"     : flow['fwd_pkts'],
                        "bwd_pkts"     : flow['bwd_pkts'],
                        "risk_level"   : result['risk_level'],
                        "prediction"   : result['prediction'],
                    }

                    self.realtime_data.append(entry)
                    if len(self.realtime_data) > MAX_REALTIME_ITEMS:
                        self.realtime_data.pop(0)

                    if result['risk_level'] == "ATTACK" and self._socketio:
                        self._attack_count += 1

                        # Reset counter every 30 seconds
                        if time.time() - self._last_attack_reset > 30:
                        self._attack_count      = 0
                        self._last_attack_reset = time.time()

                        #stop jenkins if the attack threshold exceeded
                        if self._attack_count >= self._attack_threshold:
                            threading.Thread(
                                target=jenkins_service.stop_running_builds,
                                daemon=True
                            ).start()
                            self._attack_count = 0  # Reset after action

                        self._socketio.emit('attack_alert', {
                            "src_ip"  : flow_key[0],
                            "dst_port": dst_port,
                            "fwd_pkts": flow['fwd_pkts'],
                            "time"    : entry["time"],
                            "message" : f"Attack from {flow_key[0]} → port {dst_port}",
                            "build_stopped": self._attack_count == 0
                        })

                except Exception as e:
                    print(f"Flow analysis error: {e}")

    def reset(self):
        with self.lock:
            self.flows.clear()
        self.realtime_data.clear()

flow_service = FlowService()