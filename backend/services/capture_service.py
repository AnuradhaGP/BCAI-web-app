import threading
import time
from scapy.all import sniff, IP, TCP, UDP
from config import CAPTURE_INTERFACE

class CaptureService:
    def __init__(self):
        self._flow_svc = None

    def init(self, flow_service):
        self._flow_svc = flow_service
        threading.Thread(target=self._sniff_loop, daemon=True).start()

    def _process(self, pkt):
        try:
            if not self._flow_svc or not self._flow_svc.active:
                return
            if not pkt.haslayer(IP):
                return

            is_tcp = pkt.haslayer(TCP)
            is_udp = pkt.haslayer(UDP)

            if not (is_tcp or is_udp):
                return

            proto  = pkt[TCP] if is_tcp else pkt[UDP]
            win    = pkt[TCP].window if is_tcp else 0

            self._flow_svc.process_packet(
                src    = pkt[IP].src,
                dst    = pkt[IP].dst,
                sport  = proto.sport,
                dport  = proto.dport,
                length = len(pkt),
                ts     = float(pkt.time),
                is_tcp = is_tcp,
                win    = win,
            )
        except Exception as e:
            print(f"Packet error: {e}")

    def _sniff_loop(self):
        while True:
            try:
                print(f"Capturing on {CAPTURE_INTERFACE}...")
                sniff(
                    iface=CAPTURE_INTERFACE,
                    prn=self._process,
                    store=False,
                    filter="tcp or udp"
                )
            except Exception as e:
                print(f"Sniff error: {e} - Restart in 2s...")
                time.sleep(2)


capture_service = CaptureService()