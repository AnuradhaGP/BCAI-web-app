FROM python:3.10-slim

WORKDIR /app

# Install tcpdump and libpcap for scapy packet sniffing
RUN apt-get update && apt-get install -y tcpdump libpcap-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# Require privileges for sniffing, handled in docker-compose
CMD ["python", "app.py"]
