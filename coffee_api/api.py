from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import logging
import threading
from card_reader import get_card_reader, wait_for_card_scan

app = Flask(__name__)
CORS(app)

# Configuration
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000/v1')
PORT = int(os.getenv('PORT', 5000))

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# État de la carte actuellement scannée
current_card = {
    'id': None,
    'timestamp': None,
    'lock': threading.Lock()
}

# Menu de produits
MENU = [
    # Cafés
    {"id": 1, "name": "Espresso", "category": "café", "price": 1.50, "icon": "☕"},
    {"id": 2, "name": "Americano", "category": "café", "price": 2.00, "icon": "☕"},
    {"id": 3, "name": "Cappuccino", "category": "café", "price": 2.50, "icon": "☕"},
    {"id": 4, "name": "Latte", "category": "café", "price": 3.00, "icon": "☕"},
    {"id": 5, "name": "Café Long", "category": "café", "price": 1.80, "icon": "☕"},
    # Thés
    {"id": 6, "name": "Thé Vert", "category": "thé", "price": 1.80, "icon": "🍵"},
    {"id": 7, "name": "Thé Noir", "category": "thé", "price": 1.80, "icon": "🍵"},
    {"id": 8, "name": "Thé Menthe", "category": "thé", "price": 2.00, "icon": "🍵"},
    {"id": 9, "name": "Thé Citron", "category": "thé", "price": 2.00, "icon": "🍵"},
    # Eau chaude
    {"id": 10, "name": "Eau Chaude", "category": "eau", "price": 0.50, "icon": "💧"},
]

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "coffee_api"}), 200

@app.route('/wait-card', methods=['GET'])
def wait_card():
    """
    Attend qu'une carte soit scannée sur le lecteur
    Cette route bloque jusqu'à ce qu'une carte soit détectée
    """
    try:
        timeout = request.args.get('timeout', type=int, default=30)
        logger.info(f"En attente d'une carte (timeout: {timeout}s)...")
        
        # Attendre qu'une carte soit scannée
        card_id = wait_for_card_scan(timeout=timeout)
        
        if card_id:
            with current_card['lock']:
                current_card['id'] = card_id
                import time
                current_card['timestamp'] = time.time()
            
            logger.info(f"Carte détectée: {card_id}")
            return jsonify({
                "success": True,
                "card_id": card_id,
                "message": "Carte détectée"
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Timeout: Aucune carte détectée"
            }), 408
            
    except Exception as e:
        logger.error(f"Erreur lors de l'attente de carte: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/current-card', methods=['GET'])
def get_current_card():
    """
    Récupère l'ID de la carte actuellement scannée
    """
    with current_card['lock']:
        if current_card['id']:
            return jsonify({
                "success": True,
                "card_id": current_card['id'],
                "timestamp": current_card['timestamp']
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Aucune carte scannée"
            }), 404

@app.route('/menu', methods=['GET'])
def get_menu():
    """Récupère le menu complet avec café, thé et eau chaude"""
    try:
        return jsonify({"success": True, "menu": MENU}), 200
    except Exception as e:
        logger.error(f"Error in get_menu: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/user/<card_id>', methods=['GET'])
def get_user_info(card_id):
    """
    Récupère les informations de l'utilisateur associé à une carte
    incluant le nom et le solde depuis l'API Node.js
    """
    try:
        # Récupérer les infos de la carte depuis l'API Node.js
        logger.info(f"Fetching card info for card_id: {card_id}")
        card_response = requests.get(f"{API_BASE_URL}/card/{card_id}", timeout=5)
        
        if card_response.status_code == 404:
            return jsonify({"success": False, "error": "Card not found"}), 404
        
        if card_response.status_code != 200:
            logger.error(f"API returned status {card_response.status_code}: {card_response.text}")
            return jsonify({"success": False, "error": "Failed to fetch card information"}), 500
        
        card_data = card_response.json()
        logger.info(f"Card data: {card_data}")
        
        # Vérifier que la carte a un utilisateur assigné
        if not card_data.get('user_id'):
            return jsonify({"success": False, "error": "No user assigned to this card"}), 404
        
        # Récupérer l'ID utilisateur
        user_id = card_data['user_id']['_id'] if isinstance(card_data['user_id'], dict) else card_data['user_id']
        logger.info(f"User ID: {user_id}")
        
        # Récupérer les infos complètes de l'utilisateur depuis l'API Node.js
        user_response = requests.get(f"{API_BASE_URL}/user/{user_id}", timeout=5)
        
        if user_response.status_code != 200:
            logger.error(f"Failed to fetch user {user_id}: {user_response.text}")
            return jsonify({"success": False, "error": "Failed to fetch user information"}), 500
        
        user_data = user_response.json()
        logger.info(f"User data: {user_data}")
        
        # Construire la réponse avec les informations utilisateur
        response = {
            "success": True,
            "card_id": card_id,
            "user": {
                "_id": str(user_data.get('_id')),
                "name": user_data.get('name'),
                "balance": float(user_data.get('balance', 0.0))
            },
            "card_status": card_data.get('status', 'unknown')
        }
        
        logger.info(f"User info retrieved successfully: {user_data.get('name')}, balance: {response['user']['balance']}")
        return jsonify(response), 200
        
    except requests.RequestException as e:
        logger.error(f"Error calling Node.js API: {e}")
        return jsonify({"success": False, "error": "Failed to communicate with main API"}), 500
    except Exception as e:
        logger.error(f"Error in get_user_info: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/verify-pin', methods=['POST'])
def verify_pin():
    """
    Vérifie le code PIN d'une carte en utilisant le lecteur de carte physique
    """
    try:
        data = request.get_json()
        card_id = data.get('card_id')
        pin = data.get('pin')
        
        if not card_id or not pin:
            return jsonify({"success": False, "error": "card_id and pin are required"}), 400
        
        logger.info(f"Verifying PIN for card_id: {card_id}")
        
        # Vérifier le PIN sur la carte physique si disponible
        try:
            reader = get_card_reader()
            if reader.is_card_present():
                success, remaining = reader.verify_pin(pin)
                if success:
                    logger.info(f"PIN verification successful on physical card: {card_id}")
                    return jsonify({
                        "success": True,
                        "message": "PIN verified successfully"
                    }), 200
                else:
                    logger.warning(f"PIN verification failed on physical card, {remaining} attempts remaining")
                    return jsonify({
                        "success": False,
                        "error": "Incorrect PIN",
                        "remaining_attempts": remaining
                    }), 401
        except Exception as card_error:
            logger.warning(f"Could not verify PIN on physical card: {card_error}")
            # Continuer avec la vérification via l'API Node.js
        
        # Fallback: Appeler l'API Node.js pour vérifier le PIN
        verify_response = requests.post(
            f"{API_BASE_URL}/card/verify-pin",
            json={"card_id": card_id, "pin": pin},
            timeout=5
        )
        
        if verify_response.status_code == 401:
            return jsonify({"success": False, "error": "Incorrect PIN"}), 401
        
        if verify_response.status_code != 200:
            logger.error(f"PIN verification failed: {verify_response.text}")
            return jsonify({"success": False, "error": "PIN verification failed"}), 500
        
        verify_data = verify_response.json()
        logger.info(f"PIN verification successful for card: {card_id}")
        
        return jsonify({
            "success": True,
            "message": "PIN verified successfully"
        }), 200
        
    except requests.RequestException as e:
        logger.error(f"Error calling Node.js API: {e}")
        return jsonify({"success": False, "error": "Failed to communicate with main API"}), 500
    except Exception as e:
        logger.error(f"Error in verify_pin: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/payment', methods=['POST'])
def process_payment():
    """
    Traite un paiement pour des produits du distributeur
    Vérifie le PIN et débite le compte de l'utilisateur
    """
    try:
        data = request.get_json()
        card_id = data.get('card_id')
        items = data.get('items', [])
        total_amount = data.get('total_amount')
        pin = data.get('pin')
        
        if not card_id or not items or total_amount is None or not pin:
            return jsonify({
                "success": False,
                "error": "card_id, items, total_amount, and pin are required"
            }), 400
        
        logger.info(f"Processing payment for card_id: {card_id}, amount: {total_amount}")
        
        # 1. Vérifier le PIN
        verify_response = requests.post(
            f"{API_BASE_URL}/card/verify-pin",
            json={"card_id": card_id, "pin": pin},
            timeout=5
        )
        
        if verify_response.status_code == 401:
            return jsonify({"success": False, "error": "Incorrect PIN"}), 401
        
        if verify_response.status_code != 200:
            logger.error(f"PIN verification failed: {verify_response.text}")
            return jsonify({"success": False, "error": "PIN verification failed"}), 500
        
        # 2. Récupérer les infos de l'utilisateur
        card_response = requests.get(f"{API_BASE_URL}/card/{card_id}", timeout=5)
        
        if card_response.status_code != 200:
            return jsonify({"success": False, "error": "Failed to fetch card information"}), 500
        
        card_data = card_response.json()
        user_id = card_data['user_id']['_id'] if isinstance(card_data['user_id'], dict) else card_data['user_id']
        
        user_response = requests.get(f"{API_BASE_URL}/user/{user_id}", timeout=5)
        
        if user_response.status_code != 200:
            return jsonify({"success": False, "error": "Failed to fetch user information"}), 500
        
        user_data = user_response.json()
        current_balance = float(user_data.get('balance', 0.0))
        
        # 3. Vérifier que le solde est suffisant
        if current_balance < total_amount:
            return jsonify({
                "success": False,
                "error": "Insufficient balance",
                "current_balance": current_balance,
                "required_amount": total_amount
            }), 400
        
        # 4. Débiter le compte
        new_balance = current_balance - total_amount
        
        update_response = requests.put(
            f"{API_BASE_URL}/user/{user_id}",
            json={"balance": new_balance},
            timeout=5
        )
        
        if update_response.status_code != 200:
            logger.error(f"Failed to update balance: {update_response.text}")
            return jsonify({"success": False, "error": "Failed to update balance"}), 500
        
        # 5. Créer un résumé de la transaction
        items_summary = [
            {
                "name": item['name'],
                "quantity": item['quantity'],
                "price": item['price'],
                "total": item['quantity'] * item['price']
            }
            for item in items
        ]
        
        logger.info(f"Payment successful for card {card_id}: {total_amount}€, new balance: {new_balance}€")
        
        return jsonify({
            "success": True,
            "message": "Payment processed successfully",
            "transaction": {
                "card_id": card_id,
                "user_name": user_data.get('name'),
                "items": items_summary,
                "total_amount": total_amount,
                "previous_balance": current_balance,
                "new_balance": new_balance
            },
            "new_balance": new_balance
        }), 200
        
    except requests.RequestException as e:
        logger.error(f"Error calling Node.js API: {e}")
        return jsonify({"success": False, "error": "Failed to communicate with main API"}), 500
    except Exception as e:
        logger.error(f"Error in process_payment: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    logger.info(f"Starting Coffee API on port {PORT}")
    logger.info(f"API Base URL: {API_BASE_URL}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
