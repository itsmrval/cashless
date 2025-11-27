FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    gcc \
    make \
    pkg-config \
    libpcsclite1 \
    libpcsclite-dev \
    libccid \
    libcurl4-openssl-dev \
    pcscd \
    pcsc-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN make clean && make

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
