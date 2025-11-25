#!/usr/bin/env python3

import requests
import base64
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv('API_BASE_URL', 'https://api.cashless.iut.valentinp.fr/v1')
DRIVER_USERNAME = os.getenv('DRIVER_USERNAME', 'admin')
DRIVER_PASSWORD = os.getenv('DRIVER_PASSWORD', 'admin')

# Token du driver (admin) pour accéder aux données
_driver_token = None


# Token du driver (admin) pour accéder aux données
_driver_token = None


def get_driver_token():
    """
    Authentifie le driver (admin) et récupère son token.
    Le token est mis en cache pour éviter de se reconnecter à chaque fois.
    
    Returns:
        dict: {'success': bool, 'token': str, 'error': str}
    """
    global _driver_token
    
    # Si on a déjà un token, le retourner
    if _driver_token:
        return {
            'success': True,
            'token': _driver_token
        }
    
    try:
        url = f"{API_BASE_URL}/auth/login"
        headers = {'Content-Type': 'application/json'}
        data = {
            'username': DRIVER_USERNAME,
            'password': DRIVER_PASSWORD
        }
        
        print(f"DEBUG: Connexion driver - URL: {url}, Username: {DRIVER_USERNAME}")
        
        response = requests.post(url, json=data, headers=headers, timeout=5)
        
        print(f"DEBUG: Réponse driver - Code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            if 'token' in response_data:
                _driver_token = response_data['token']
                print("DEBUG: Token driver récupéré avec succès")
                return {
                    'success': True,
                    'token': _driver_token
                }
        
        # Essayer de parser le message d'erreur
        try:
            error_data = response.json()
            error_msg = error_data.get('error', f'Status {response.status_code}')
        except:
            error_msg = f'Status {response.status_code}'
        
        return {
            'success': False,
            'error': f'Driver login failed: {error_msg}'
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
        
        return {
            'success': False,
            'error': f'Failed to get challenge: {response.status_code}'
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


def card_auth(card_id, pin):
    """
    Authentifie une carte avec son PIN.
    Cette fonction ne fait que vérifier localement le PIN (déjà fait sur la carte).
    Elle retourne un "pseudo-token" qui sera utilisé avec le token driver.
    
    Args:
        card_id: L'identifiant de la carte
        pin: Le code PIN (4 chiffres) - déjà vérifié par la carte
        
    Returns:
        dict: {'success': bool, 'token': str, 'error': str}
    """
    # Le PIN a déjà été vérifié par la carte physique
    # On n'a pas besoin d'authentifier auprès de l'API
    # On retourne simplement un succès
    return {
        'success': True,
        'token': 'local_verified'  # Token fictif car la vérification est locale
    }


def fetch_user_by_card(card_id, card_token):
    """
    Récupère les informations utilisateur (prénom et balance) via le card_id.
    Utilise le token driver pour l'accès aux données.
    
    Args:
        card_id: L'identifiant de la carte
        card_token: Ignoré - on utilise le token driver à la place
        
    Returns:
        dict: {'success': bool, 'name': str, 'balance': float, 'error': str}
    """
    try:
        # Récupérer le token driver
        driver_result = get_driver_token()
        if not driver_result['success']:
            return {
                'success': False,
                'error': f"Failed to get driver token: {driver_result.get('error')}"
            }
        
        driver_token = driver_result['token']
        
        # Récupérer les informations utilisateur
        url = f"{API_BASE_URL}/user"
        params = {'card_id': card_id}
        headers = {'Authorization': f'Bearer {driver_token}'}
        
        print(f"DEBUG: Récupération user - URL: {url}?card_id={card_id}")
        
        response = requests.get(url, params=params, headers=headers, timeout=5)
        
        print(f"DEBUG: Réponse user - Code: {response.status_code}")
        
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
        print(f"DEBUG: Données user reçues: {user_data}")
        
        if 'firstName' not in user_data or 'id' not in user_data:
            return {
                'success': False,
                'error': 'Invalid user data received'
            }
        
        user_id = user_data['id']
        first_name = user_data['firstName']
        
        # Récupérer le balance
        balance_url = f"{API_BASE_URL}/user/{user_id}/balance"
        
        print(f"DEBUG: Récupération balance - URL: {balance_url}")
        
        balance_response = requests.get(balance_url, headers=headers, timeout=5)
        
        print(f"DEBUG: Réponse balance - Code: {balance_response.status_code}")
        
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
        print(f"DEBUG: Données balance reçues: {balance_data}")
        
        if 'balance' not in balance_data:
            return {
                'success': False,
                'error': 'Invalid balance data received'
            }
        
        balance = float(balance_data['balance']) / 100.0  # Convertir centimes en euros
        
        print(f"DEBUG: User trouvé - Name: {first_name}, Balance: {balance}€")
        
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


def create_transaction(card_token, amount, merchant_name):
    """
    Crée une transaction (paiement).
    Utilise le token driver pour créer la transaction.
    
    Args:
        card_token: Ignoré - on utilise le token driver
        amount: Le montant en euros
        merchant_name: Le nom du marchand
        
    Returns:
        dict: {'success': bool, 'transaction_id': str, 'new_balance': float, 'error': str}
    """
    try:
        # Récupérer le token driver
        driver_result = get_driver_token()
        if not driver_result['success']:
            return {
                'success': False,
                'error': f"Failed to get driver token: {driver_result.get('error')}"
            }
        
        driver_token = driver_result['token']
        
        url = f"{API_BASE_URL}/transactions"
        headers = {
            'Authorization': f'Bearer {driver_token}',
            'Content-Type': 'application/json'
        }
        data = {
            'amount': int(amount * 100),  # Convertir euros en centimes
            'merchant': merchant_name
        }
        
        print(f"DEBUG: Création transaction - Montant: {amount}€, Merchant: {merchant_name}")
        
        response = requests.post(url, json=data, headers=headers, timeout=5)
        
        print(f"DEBUG: Réponse transaction - Code: {response.status_code}")
        
        if response.status_code == 201:
            transaction_data = response.json()
            print(f"DEBUG: Transaction créée: {transaction_data}")
            return {
                'success': True,
                'transaction_id': transaction_data.get('id'),
                'new_balance': float(transaction_data.get('newBalance', 0)) / 100.0
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
