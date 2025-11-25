#!/usr/bin/env python3

from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import time
import logging
from card_reader import wait_for_reader, check_card_present, read_card_id, is_card_still_present, verify_pin, sign_challenge
from api import get_challenge, card_auth_with_signature, fetch_user_by_card, create_transaction

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'cashless-secret-key-2025'
CORS(app, resources={r"/*": {"origins": "*"}})

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

reader = None
current_card_id = None
current_connection = None
current_card_token = None
detection_thread = None
running = True


def card_detection_loop():
    global reader, current_card_id, current_connection, current_card_token, running
    
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
                    current_card_token = None
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
                    current_card_token = None
                    
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
    global current_connection, current_card_id, current_card_token    
    
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
    
    if result['success']:
        logger.info(f"PIN correct - Challenge en cours...")
        
        challenge_result = get_challenge(current_card_id)
        
        if not challenge_result['success']:
            error_msg = challenge_result.get('error', '')
            logger.error(f"Erreur récupération challenge: {error_msg}")
            
            if 'not active' in error_msg.lower() or 'inactive' in error_msg.lower():
                user_error = "Carte inactive ou bloquée. Veuillez contacter un administrateur."
            else:
                user_error = f"Erreur lors de la récupération du challenge: {error_msg}"
            
            emit('pin_verification_result', {
                'success': False,
                'error': user_error,
                'attempts_remaining': None,
                'blocked': False
            })
            return
        
        challenge = challenge_result['challenge']
        
        sign_result = sign_challenge(current_connection, challenge)
        
        if not sign_result['success']:
            logger.error(f"Erreur signature challenge: {sign_result.get('error')}")
            emit('pin_verification_result', {
                'success': False,
                'error': f"Erreur lors de la signature: {sign_result.get('error')}",
                'attempts_remaining': None,
                'blocked': False
            })
            return
        
        signature = sign_result['signature']
        
        auth_result = card_auth_with_signature(current_card_id, challenge, signature)
        
        if auth_result['success']:
            current_card_token = auth_result['token']
            logger.info(f"Authentification API réussie")
            
            user_result = fetch_user_by_card(current_card_id, current_card_token)
            
            if user_result['success']:
                logger.info(f"Utilisateur: {user_result['name']}, Balance: {user_result['balance']}€")
                
                emit('pin_verification_result', {
                    'success': True,
                    'attempts_remaining': 3,
                    'blocked': False,
                    'user': {
                        'name': user_result['name'],
                        'balance': user_result['balance'],
                        'card_id': current_card_id
                    }
                })
            else:
                logger.error(f"Erreur récupération utilisateur: {user_result.get('error')}")
                emit('pin_verification_result', {
                    'success': False,
                    'error': f"Erreur lors de la récupération des données utilisateur: {user_result.get('error')}",
                    'attempts_remaining': None,
                    'blocked': False
                })
        else:
            logger.error(f"Erreur authentification API: {auth_result.get('error')}")
            emit('pin_verification_result', {
                'success': False,
                'error': f"Erreur d'authentification: {auth_result.get('error')}",
                'attempts_remaining': None,
                'blocked': False
            })
    elif result.get('blocked'):
        logger.warning(f"Carte bloquée (0 tentatives restantes)")
        emit('pin_verification_result', result)
    else:
        logger.warning(f"PIN incorrect - Tentatives restantes: {result.get('attempts_remaining', '?')}")
        emit('pin_verification_result', result)

@socketio.on('create_transaction')
def handle_create_transaction(data):
    global current_card_token, current_card_id    

    if not current_card_token:
        emit('transaction_result', {
            'success': False,
            'error': 'Non authentifié. Veuillez d\'abord vérifier votre PIN.'
        })
        logger.warning("Tentative de transaction sans authentification")
        return
    
    if not current_card_id:
        emit('transaction_result', {
            'success': False,
            'error': 'Carte non détectée.'
        })
        logger.warning("Tentative de transaction sans carte")
        return
    
    amount = data.get('amount')
    merchant = data.get('merchant', 'CoffeeShop')
    
    if not amount or amount <= 0:
        emit('transaction_result', {
            'success': False,
            'error': 'Montant invalide'
        })
        logger.warning(f"Montant invalide reçu: {amount}")
        return
    
    result = create_transaction(current_card_token, current_card_id, amount, merchant)
    
    if result['success']:
        emit('transaction_result', {
            'success': True,
            'transaction_id': result.get('transaction_id'),
            'new_balance': result['new_balance'],
            'message': 'Transaction effectuée avec succès'
        })
    
    else:
        logger.error(f"Erreur transaction: {result.get('error')}")
        emit('transaction_result', {
            'success': False,
            'error': result.get('error', 'Erreur inconnue')
        })

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
    
    logger.info("Démarrage du serveur Flask-SocketIO sur http://0.0.0.0:8001")
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=8001,
        debug=False,
        use_reloader=False
    )