#!/usr/bin/env python3

import requests
import base64
import json
import sys
import logging

logger = logging.getLogger(__name__)

# Global variables to be set by init() or command-line
API_BASE_URL = None
DEST_ID = None
MERCHANT_TOKEN = None

def init(api_base_url, dest_id=None):
    """
    Initialize the API module with configuration.

    Args:
        api_base_url: Base URL for the API
        dest_id: Destination user ID for transactions (optional, can be fetched via login)
    """
    global API_BASE_URL, DEST_ID
    API_BASE_URL = api_base_url
    if dest_id:
        DEST_ID = dest_id
    logger.info(f"API initialized with base URL: {API_BASE_URL}")
    if DEST_ID:
        logger.info(f"Destination ID: {DEST_ID}")


def login_merchant(username, password):
    """
    Login as merchant user to get authentication token and user ID.

    Args:
        username: Merchant username
        password: Merchant password

    Returns:
        dict: {'success': bool, 'token': str, 'user_id': str, 'error': str}
    """
    global DEST_ID, MERCHANT_TOKEN

    try:
        url = f"{API_BASE_URL}/auth/login"
        data = {
            'username': username,
            'password': password
        }

        response = requests.post(url, json=data, timeout=5)

        if response.status_code == 200:
            result = response.json()
            MERCHANT_TOKEN = result['token']
            DEST_ID = result['user']['id']

            logger.info(f"Merchant login successful: {result['user']['name']} (ID: {DEST_ID})")

            return {
                'success': True,
                'token': MERCHANT_TOKEN,
                'user_id': DEST_ID,
                'name': result['user']['name']
            }
        else:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', f'Status {response.status_code}')
            except:
                error_msg = f'Status {response.status_code}'

            logger.error(f"Merchant login failed: {error_msg}")
            return {
                'success': False,
                'error': f'Login failed: {error_msg}'
            }

    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': 'Request timeout'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def get_challenge(card_id):
    """
    Récupère un challenge depuis l'API pour l'authentification par carte.
    
    Args:
        card_id: L'identifiant de la carte
        
    Returns:
        dict: {'success': bool, 'challenge': str, 'error': str}
    """
    try:
        url = f"{API_BASE_URL}/auth/challenge"
        params = {'card_id': card_id}
                
        response = requests.get(url, params=params, timeout=5)
                
        if response.status_code == 200:
            data = response.json()
            if 'challenge' in data:
                return {
                    'success': True,
                    'challenge': data['challenge']
                }
        
        try:
            error_data = response.json()
            error_msg = error_data.get('error', f'Status {response.status_code}')
        except:
            error_msg = f'Status {response.status_code}'
        
        return {
            'success': False,
            'error': f'Failed to get challenge: {error_msg}'
        }
        
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': 'Request timeout'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def card_auth_with_signature(card_id, challenge, signature):
    try:
        url = f"{API_BASE_URL}/auth/card"
        headers = {'Content-Type': 'application/json'}
        
        # Encoder la signature en base64
        signature_b64 = base64.b64encode(signature).decode('utf-8')
        
        data = {
            'card_id': card_id,
            'challenge': challenge,
            'signature': signature_b64
        }
                
        response = requests.post(url, json=data, headers=headers, timeout=5)
                
        if response.status_code == 200:
            response_data = response.json()
            if 'token' in response_data:
                return {
                    'success': True,
                    'token': response_data['token']
                }
        
        try:
            error_data = response.json()
            error_msg = error_data.get('error', f'Status {response.status_code}')
        except:
            error_msg = f'Status {response.status_code}'
        
        return {
            'success': False,
            'error': f'Authentication failed: {error_msg}'
        }
        
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': 'Request timeout'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def fetch_user_by_card(card_id, card_token):
    try:
        url = f"{API_BASE_URL}/user"
        params = {'card_id': card_id}
        headers = {'Authorization': f'Bearer {card_token}'}
                
        response = requests.get(url, params=params, headers=headers, timeout=5)
                
        if response.status_code != 200:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', f'Status {response.status_code}')
            except:
                error_msg = f'Status {response.status_code}'
            return {
                'success': False,
                'error': f'Failed to fetch user: {error_msg}'
            }
        
        user_data = response.json()        

        if 'name' not in user_data or '_id' not in user_data:
            return {
                'success': False,
                'error': 'Invalid user data received'
            }
        
        user_id = user_data['_id']
        full_name = user_data['name']
        
        first_name = full_name.split()[0] if full_name else 'Utilisateur'
                
        balance_url = f"{API_BASE_URL}/user/{user_id}/balance"
                
        balance_response = requests.get(balance_url, headers=headers, timeout=5)
                
        if balance_response.status_code != 200:
            try:
                error_data = balance_response.json()
                error_msg = error_data.get('error', f'Status {balance_response.status_code}')
            except:
                error_msg = f'Status {balance_response.status_code}'
            return {
                'success': False,
                'error': f'Failed to fetch balance: {error_msg}'
            }
        
        balance_data = balance_response.json()
        
        if 'balance' not in balance_data:
            return {
                'success': False,
                'error': 'Invalid balance data received'
            }
        
        balance = float(balance_data['balance']) / 100.0  # Convertir centimes en euros
                
        return {
            'success': True,
            'name': first_name,
            'balance': balance,
            'user_id': user_id
        }
        
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': 'Request timeout'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def get_user_balance(card_token, card_id):
    try:
        url = f"{API_BASE_URL}/user"
        params = {'card_id': card_id}
        headers = {
            'Authorization': f'Bearer {card_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=5)
        
        if response.status_code != 200:
            print(f"DEBUG get_user_balance: ERREUR - Status {response.status_code}")
            return {
                'success': False,
                'error': f'Failed to fetch user info: {response.status_code}'
            }
        
        user_data = response.json()
        user_id = user_data.get('_id')
        
        if not user_id:
            print(f"DEBUG get_user_balance: ERREUR - Pas d'ID utilisateur")
            return {
                'success': False,
                'error': 'Invalid user data - no user_id'
            }
        
        balance_url = f"{API_BASE_URL}/user/{user_id}/balance"
        balance_response = requests.get(balance_url, headers=headers, timeout=5)
        
        if balance_response.status_code != 200:
            print(f"DEBUG get_user_balance: ERREUR - Status {balance_response.status_code}")
            return {
                'success': False,
                'error': f'Failed to fetch balance: {balance_response.status_code}'
            }
        
        balance_data = balance_response.json()
        balance_centimes = balance_data.get('balance', 0)
        balance = float(balance_centimes) / 100.0
                
        return {
            'success': True,
            'balance': balance
        }
        
    except Exception as e:
        print(f"DEBUG get_user_balance: EXCEPTION - {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def create_transaction(card_token, card_id, amount, merchant_name, refund=False):
    try:
        if not DEST_ID:
            return {
                'success': False,
                'error': 'DEST_ID not configured'
            }

        url = f"{API_BASE_URL}/transactions"

        if refund:
            # For refunds, use merchant token to send money back to user
            if not MERCHANT_TOKEN:
                return {
                    'success': False,
                    'error': 'Merchant not authenticated. Cannot process refund.'
                }

            user_result = fetch_user_by_card(card_id, card_token)
            if not user_result['success']:
                return {
                    'success': False,
                    'error': f"Impossible de récupérer l'utilisateur: {user_result.get('error')}"
                }
            user_id = user_result['user_id']

            headers = {
                'Authorization': f'Bearer {MERCHANT_TOKEN}',
                'Content-Type': 'application/json'
            }

            data = {
                'destination_user_id': user_id,
                'operation': int(amount * 100)
            }
        else:
            # For normal payments, use card token (user pays merchant)
            headers = {
                'Authorization': f'Bearer {card_token}',
                'Content-Type': 'application/json'
            }

            data = {
                'destination_user_id': DEST_ID,
                'operation': int(amount * 100)
            }
                
        response = requests.post(url, json=data, headers=headers, timeout=5)
                
        if response.status_code == 201:
            transaction_data = response.json()
            
            balance_result = get_user_balance(card_token, card_id)
            
            if balance_result['success']:
                new_balance = balance_result['balance']
            else:
                print(f"DEBUG: ERREUR - Impossible de récupérer le solde: {balance_result.get('error')}")
                return {
                    'success': False,
                    'error': f"Transaction créée mais impossible de récupérer le nouveau solde: {balance_result.get('error')}"
                }
            
            return {
                'success': True,
                'transaction_id': transaction_data.get('_id'),
                'new_balance': new_balance
            }
        
        try:
            error_data = response.json()
            error_msg = error_data.get('error', f'Status {response.status_code}')
        except:
            error_msg = f'Status {response.status_code}'
        
        return {
            'success': False,
            'error': f'Transaction failed: {error_msg}'
        }

    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': 'Request timeout'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: python api.py <API_BASE_URL> <DEST_USERNAME> <DEST_PASSWORD>")
        print("\nExample:")
        print("  python api.py https://api.cashless.iut.valentinp.fr/v1 merchant_user merchant_pass")
        sys.exit(1)

    api_base_url = sys.argv[1]
    dest_username = sys.argv[2]
    dest_password = sys.argv[3]

    init(api_base_url)
    print(f"API module configured successfully")
    print(f"API Base URL: {API_BASE_URL}")

    print(f"\nAuthenticating merchant: {dest_username}")
    result = login_merchant(dest_username, dest_password)

    if result['success']:
        print(f"✓ Merchant authenticated: {result['name']}")
        print(f"✓ Merchant ID: {result['user_id']}")
        print(f"✓ Token acquired")
    else:
        print(f"✗ Authentication failed: {result['error']}")
        sys.exit(1)
