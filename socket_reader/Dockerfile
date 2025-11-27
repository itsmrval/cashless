FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    pcscd \
    pcsc-tools \
    libpcsclite-dev \
    gcc \
    swig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD python app.py "${API_BASE_URL}" "${DEST_USERNAME}" "${DEST_PASSWORD}"
