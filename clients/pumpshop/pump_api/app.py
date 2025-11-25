#!/usr/bin/env python3

from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import time
import logging
from card_reader import wait_for_reader, check_card_present, read_card_id, is_card_still_present, verify_pin

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'cashless-pump-secret-key-2025'
CORS(app, resources={r"/*": {"origins": "*"}})

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

reader = None
current_card_id = None
current_connection = None
detection_thread = None
running = True


def card_detection_loop():
    global reader, current_card_id, current_connection, running
    
    logger.info("Démarrage de la boucle de détection des cartes")
    
    while running:
        try:
            if reader is None:
                time.sleep(1)
                continue
            
            connection = check_card_present(reader)
            
            if connection:
                time.sleep(0.2)
                
                card_id = read_card_id(connection)
                
                if card_id and card_id != current_card_id:
                    current_card_id = card_id
                    current_connection = connection
                    logger.info(f"Nouvelle carte détectée: {card_id}")
                    
                    socketio.emit('card_inserted', {
                        'card_id': card_id,
                        'timestamp': time.time()
                    })
                    
                    logger.info(f"Événement 'card_inserted' envoyé à tous les clients")
                    
                    while is_card_still_present(connection) and running:
                        time.sleep(0.5)
                    
                    logger.info(f"Carte retirée: {card_id}")
                    old_card_id = current_card_id
                    current_card_id = None
                    current_connection = None
                    
                    socketio.emit('card_removed', {
                        'card_id': old_card_id,
                        'timestamp': time.time()
                    })
                    
                    logger.info(f"Événement 'card_removed' envoyé à tous les clients")
                    
                    try:
                        connection.disconnect()
                    except:
                        pass
                else:
                    try:
                        connection.disconnect()
                    except:
                        pass
            
            time.sleep(0.5)
            
        except Exception as e:
            logger.error(f"Erreur dans la boucle de détection: {e}")
            time.sleep(2)
    
    logger.info("Boucle de détection arrêtée")


@socketio.on('connect')
def handle_connect():
    from flask import request
    logger.info(f"Client Socket.IO connecté: {request.sid}")
    
    if current_card_id:
        emit('card_inserted', {
            'card_id': current_card_id,
            'timestamp': time.time()
        })
        logger.info(f"État actuel envoyé au nouveau client: {current_card_id}")


@socketio.on('disconnect')
def handle_disconnect():
    from flask import request
    logger.info(f"Client Socket.IO déconnecté: {request.sid}")


@socketio.on('ping')
def handle_ping():
    emit('pong', {'timestamp': time.time()})


@socketio.on('verify_pin')
def handle_verify_pin(data):
    global current_connection
    from flask import request
    
    logger.info(f"Demande de vérification PIN du client: {request.sid}")
    
    if not current_connection:
        emit('pin_verification_result', {
            'success': False,
            'error': 'Aucune carte insérée',
            'attempts_remaining': None,
            'blocked': False
        })
        logger.warning("Tentative de vérification PIN sans carte insérée")
        return
    
    pin = data.get('pin', '')
    
    if not pin or len(pin) != 4:
        emit('pin_verification_result', {
            'success': False,
            'error': 'PIN invalide (4 chiffres requis)',
            'attempts_remaining': None,
            'blocked': False
        })
        logger.warning(f"PIN invalide reçu: longueur={len(pin)}")
        return
    
    if not pin.isdigit():
        emit('pin_verification_result', {
            'success': False,
            'error': 'PIN doit contenir uniquement des chiffres',
            'attempts_remaining': None,
            'blocked': False
        })
        logger.warning(f"PIN non numérique reçu")
        return
    
    logger.info(f"Vérification du PIN sur la carte...")
    result = verify_pin(current_connection, pin)
    
    emit('pin_verification_result', result)
    
    if result['success']:
        logger.info(f"PIN correct")
    elif result.get('blocked'):
        logger.warning(f"Carte bloquée (0 tentatives restantes)")
    else:
        logger.warning(f"PIN incorrect - Tentatives restantes: {result.get('attempts_remaining', '?')}")


@socketio.on('process_payment')
def handle_payment(data):
    from flask import request
    
    logger.info(f"Demande de paiement du client: {request.sid}")
    
    amount = data.get('amount', 0)
    fuel_type = data.get('fuel_type', '')
    liters = data.get('liters', 0)
    
    logger.info(f"Paiement: {liters}L de {fuel_type} pour {amount}€")
    
    # Simuler le traitement du paiement
    time.sleep(1)
    
    emit('payment_result', {
        'success': True,
        'amount': amount,
        'fuel_type': fuel_type,
        'liters': liters,
        'timestamp': time.time()
    })
    
    logger.info(f"Paiement accepté: {amount}€")


def initialize_reader():
    global reader, detection_thread
    
    logger.info("Initialisation du lecteur de cartes...")
    
    reader = wait_for_reader()
    logger.info(f"Lecteur initialisé: {reader}")
    
    detection_thread = threading.Thread(target=card_detection_loop, daemon=True)
    detection_thread.start()
    logger.info("Thread de détection démarré")


if __name__ == '__main__':
    init_thread = threading.Thread(target=initialize_reader, daemon=True)
    init_thread.start()
    
    time.sleep(2)
    
    logger.info("Démarrage du serveur Flask-SocketIO sur http://0.0.0.0:8002")
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=8002,
        debug=False,
        use_reloader=False
    )
