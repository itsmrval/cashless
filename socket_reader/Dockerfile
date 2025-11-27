FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    pcscd \
    pcsc-tools \
    libpcsclite1 \
    libpcsclite-dev \
    libccid \
    gcc \
    swig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 8001

ENTRYPOINT ["./entrypoint.sh"]
