#!/usr/bin/env python3

from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import time
import logging
import sys
from card_reader import wait_for_reader, check_card_present, read_card_id, read_version, is_card_still_present, verify_pin, sign_challenge, check_pin_defined, is_reader_connected
import api
from api import get_challenge, card_auth_with_signature, fetch_user_by_card, create_transaction
import ssl
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'cashless-secret-key-2025'
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_private_network_access(response):
    response.headers['Access-Control-Allow-Private-Network'] = 'true'
    return response

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

reader = None
current_card_id = None
current_connection = None
current_card_token = None
current_card_activated = None
detection_thread = None
running = True


def card_detection_loop():
    global reader, current_card_id, current_connection, current_card_token, current_card_activated, running
    
    logger.info("Démarrage de la boucle de détection des cartes")
    
    while running:
        try:
            connection = check_card_present(reader)
            
            if connection:
                time.sleep(0.2)
                
                card_id = read_card_id(connection)
                
                if card_id and card_id != current_card_id:
                    current_card_id = card_id
                    current_connection = connection
                    current_card_token = None
                    logger.info(f"Nouvelle carte détectée: {card_id}")

                    # Check if PIN is defined
                    pin_status = check_pin_defined(connection)
                    pin_defined = False
                    if pin_status['success']:
                        pin_defined = pin_status['pin_defined']
                        logger.info(f"PIN défini: {pin_defined}")
                    else:
                        logger.warning(f"Erreur lors de la vérification du PIN: {pin_status.get('error', 'Unknown error')}")

                    current_card_activated = pin_defined

                    socketio.emit('card_inserted', {
                        'card_id': card_id,
                        'timestamp': time.time(),
                        'activated': pin_defined
                    })

                    logger.info(f"Événement 'card_inserted' envoyé (activated={pin_defined})")

                    while is_card_still_present(connection) and running:
                        time.sleep(0.5)
                    
                    logger.info(f"Carte retirée: {card_id}")
                    old_card_id = current_card_id
                    current_card_id = None
                    current_connection = None
                    current_card_token = None
                    current_card_activated = None
                    
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
            logger.error(f"❌ Erreur dans la boucle de détection: {e}")
            time.sleep(2)
    
    logger.info("Boucle de détection arrêtée")

@socketio.on('connect')
def handle_connect():
    from flask import request
    logger.info(f"Client Socket.IO connecté: {request.sid}")

    if current_card_id:
        emit('card_inserted', {
            'card_id': current_card_id,
            'timestamp': time.time(),
            'activated': current_card_activated if current_card_activated is not None else True
        })
        logger.info(f"État actuel envoyé au nouveau client: {current_card_id} (activated={current_card_activated})")

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
    refund = data.get('refund', False)
    
    if not amount or amount <= 0:
        emit('transaction_result', {
            'success': False,
            'error': 'Montant invalide'
        })
        logger.warning(f"Montant invalide reçu: {amount}")
        return
    
    if refund:
        logger.info(f"Remboursement de {amount}€ demandé pour la carte {current_card_id}")
    
    result = create_transaction(current_card_token, current_card_id, amount, merchant, refund)
    
    if result['success']:
        if refund:
            logger.info(f"Remboursement réussi: {amount}€ - Nouveau solde: {result['new_balance']}€")
        emit('transaction_result', {
            'success': True,
            'transaction_id': result.get('transaction_id'),
            'new_balance': result['new_balance'],
            'refund': refund,
            'message': 'Remboursement effectué avec succès' if refund else 'Transaction effectuée avec succès'
        })
    
    else:
        logger.error(f"Erreur {'remboursement' if refund else 'transaction'}: {result.get('error')}")
        emit('transaction_result', {
            'success': False,
            'error': result.get('error', 'Erreur inconnue')
        })

@socketio.on('get_balance')
def handle_get_balance():
    global current_card_token, current_card_id
    from flask import request
    
    logger.info(f"Demande de récupération du solde du client: {request.sid}")
    
    if not current_card_token:
        emit('balance_result', {
            'success': False,
            'error': 'Non authentifié. Veuillez d\'abord vérifier votre PIN.'
        })
        logger.warning("Tentative de récupération du solde sans authentification")
        return
    
    if not current_card_id:
        emit('balance_result', {
            'success': False,
            'error': 'Carte non détectée.'
        })
        logger.warning("Tentative de récupération du solde sans carte")
        return
    
    logger.info(f"Récupération du solde pour la carte {current_card_id}")
    
    # Importer la fonction get_user_balance depuis api
    from api import get_user_balance
    
    result = get_user_balance(current_card_token, current_card_id)
    
    if result['success']:
        logger.info(f"Solde récupéré: {result['balance']}€")
        emit('balance_result', {
            'success': True,
            'balance': result['balance']
        })
    else:
        logger.error(f"Erreur récupération solde: {result.get('error')}")
        emit('balance_result', {
            'success': False,
            'error': result.get('error', 'Erreur inconnue')
        })


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: python app.py <API_BASE_URL> <DEST_USERNAME> <DEST_PASSWORD>")
        print("\nExample:")
        print("  python app.py https://api.cashless.rvcs.fr/v1 merchant_user merchant_pass")
        sys.exit(1)

    api_base_url = sys.argv[1]
    dest_username = sys.argv[2]
    dest_password = sys.argv[3]

    # Initialize API module with base URL
    api.init(api_base_url)
    logger.info(f"API configured with base URL: {api_base_url}")

    # Login as merchant to get token and user ID
    logger.info(f"Authenticating merchant user: {dest_username}")
    login_result = api.login_merchant(dest_username, dest_password)

    if not login_result['success']:
        logger.error(f"Failed to authenticate merchant: {login_result.get('error')}")
        print(f"ERROR: Merchant authentication failed: {login_result.get('error')}")
        sys.exit(1)

    logger.info(f"Merchant authenticated successfully: {login_result['name']} (ID: {login_result['user_id']})")

    cert_file = os.path.join(os.path.dirname(__file__), 'certs', 'cert.pem')
    key_file = os.path.join(os.path.dirname(__file__), 'certs', 'key.pem')
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(cert_file, key_file)

    # Vérifier qu'un lecteur est connecté au démarrage
    logger.info("Recherche d'un lecteur de cartes...")
    reader = wait_for_reader()
    
    if reader is None:
        logger.error("Aucun lecteur de cartes détecté. Arrêt du serveur.")
        print("ERROR: Aucun lecteur de cartes détecté.")
        sys.exit(1)
    
    logger.info(f"Lecteur détecté: {reader}")
    
    # Démarrer le thread de détection de cartes
    detection_thread = threading.Thread(target=card_detection_loop, daemon=True)
    detection_thread.start()
    logger.info("Thread de détection démarré")
    
    time.sleep(1)
    
    logger.info("Démarrage du serveur Flask-SocketIO sur https://0.0.0.0:8001")
    
    try:
        socketio.run(
            app,
            host='0.0.0.0',
            port=8001,
            debug=False,
            use_reloader=False,
            ssl_context=ssl_context,
            allow_unsafe_werkzeug=True
        )
    except Exception as e:
        logger.error(f"Erreur serveur: {e}")
    
    logger.info("Serveur arrêté")