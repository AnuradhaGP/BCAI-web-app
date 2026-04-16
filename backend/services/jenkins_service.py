
import requests
from requests.auth import HTTPBasicAuth
from config import JENKINS_URL,JENKINS_USER,JENKINS_API_TOKEN,JENKINS_JOB_NAME
import time
import threading
import os

class JenkinsService:
    def __init__(self):
        self.url = JENKINS_URL
        self.user = JENKINS_USER
        self.token = JENKINS_API_TOKEN
        self.job = JENKINS_JOB_NAME
        self.auth = HTTPBasicAuth(self.user, self.token)
        self._last_stop = 0
        self._cooldown_secs = 30   # 30 seconds cooldown
        self._lock = threading.Lock()


    def _get_crumb(self):
        try:
            res = requests.get(
                f"{self.url}/crumbIssuer/api/json",
                auth=self.auth,
                timeout=5
            )
            crumb = res.json()
            return {crumb['crumbRequestField']: crumb['crumb']}
        except Exception:
            return {}

    def stop_running_builds(self):
        with self._lock:
            now = time.time()
            if now - self._last_stop < self._cooldown_secs:
                remaining = int(self._cooldown_secs - (now - self._last_stop))
                print(f"Cooldown active - {remaining}s remaining, skip stop")
                return []

            self._last_stop = now

        try:
            # get Running builds list 
            res = requests.get(
                f"{self.url}/job/{self.job}/api/json"
                f"?tree=builds[number,building]",
                auth=self.auth,
                timeout=5
            )
            builds  = res.json().get('builds', [])
            stopped = []

            for build in builds:
                if build.get('building'):
                    requests.post(
                        f"{self.url}/job/{self.job}/{build['number']}/stop",
                        auth=self.auth,
                        headers=self._get_crumb(),
                        timeout=5
                    )
                    stopped.append(build['number'])
                    print(f"Stopped build #{build['number']}")

            return stopped

        except Exception as e:
            print(f"Stop builds error: {e}")
            return []


jenkins_service = JenkinsService()