#!/usr/bin/env python3

import requests
import base64
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv('API_BASE_URL', 'https://api.cashless.iut.valentinp.fr/v1')
DEST_ID = os.getenv('DEST_ID', '6925915f6a63bc32613822c5')


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
        
        print(f"DEBUG: Récupération challenge - URL: {url}?card_id={card_id}")
        
        response = requests.get(url, params=params, timeout=5)
        
        print(f"DEBUG: Réponse challenge - Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'challenge' in data:
                print(f"DEBUG: Challenge reçu: {data['challenge']}")
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
    """
    Authentifie une carte avec une signature cryptographique.
    
    Args:
        card_id: L'identifiant de la carte
        challenge: Le challenge reçu de l'API (hex string)
        signature: La signature générée par la carte (bytes)
        
    Returns:
        dict: {'success': bool, 'token': str, 'error': str}
    """
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
        
        print(f"DEBUG: Authentification carte - URL: {url}")
        print(f"DEBUG: card_id: {card_id}, challenge: {challenge}, signature_b64: {signature_b64}")
        
        response = requests.post(url, json=data, headers=headers, timeout=5)
        
        print(f"DEBUG: Réponse auth - Code: {response.status_code}")
        print(f"DEBUG: Réponse brute: {response.text}")
        
        if response.status_code == 200:
            response_data = response.json()
            if 'token' in response_data:
                print("DEBUG: Token carte récupéré avec succès")
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
    """
    Récupère les informations utilisateur (prénom et balance) via le token de la carte.
    
    Args:
        card_id: L'identifiant de la carte
        card_token: Le token d'authentification de la carte
        
    Returns:
        dict: {'success': bool, 'name': str, 'balance': float, 'error': str}
    """
    try:
        # Récupérer les informations utilisateur
        url = f"{API_BASE_URL}/user"
        params = {'card_id': card_id}
        headers = {'Authorization': f'Bearer {card_token}'}
        
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
        
        # L'API retourne 'name' (nom complet) et '_id', pas 'firstName'
        if 'name' not in user_data or '_id' not in user_data:
            return {
                'success': False,
                'error': 'Invalid user data received'
            }
        
        user_id = user_data['_id']
        full_name = user_data['name']
        
        # Extraire le prénom (premier mot du nom complet)
        first_name = full_name.split()[0] if full_name else 'Utilisateur'
        
        print(f"DEBUG: User ID: {user_id}, Nom complet: {full_name}, Prénom: {first_name}")
        
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


def get_user_balance(card_token):
    """
    Récupère le solde de l'utilisateur authentifié.
    
    Args:
        card_token: Le token d'authentification de la carte
        
    Returns:
        dict: {'success': bool, 'balance': float, 'error': str}
    """
    try:
        # Récupérer d'abord les infos user pour obtenir l'ID
        url = f"{API_BASE_URL}/card/me"
        headers = {
            'Authorization': f'Bearer {card_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        
        if response.status_code != 200:
            return {
                'success': False,
                'error': 'Failed to fetch user info'
            }
        
        user_data = response.json()
        user_id = user_data.get('_id')
        
        if not user_id:
            return {
                'success': False,
                'error': 'Invalid user data'
            }
        
        # Récupérer le balance
        balance_url = f"{API_BASE_URL}/user/{user_id}/balance"
        balance_response = requests.get(balance_url, headers=headers, timeout=5)
        
        if balance_response.status_code != 200:
            return {
                'success': False,
                'error': 'Failed to fetch balance'
            }
        
        balance_data = balance_response.json()
        balance = float(balance_data.get('balance', 0)) / 100.0
        
        return {
            'success': True,
            'balance': balance
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def create_transaction(card_token, amount, merchant_name):
    """
    Crée une transaction (paiement).
    
    Args:
        card_token: Le token d'authentification de la carte
        amount: Le montant en euros (positif)
        merchant_name: Le nom du marchand (non utilisé, pour compatibilité)
        
    Returns:
        dict: {'success': bool, 'transaction_id': str, 'new_balance': float, 'error': str}
    """
    try:
        if not DEST_ID:
            return {
                'success': False,
                'error': 'DEST_ID not configured in .env'
            }
        
        url = f"{API_BASE_URL}/transactions"
        headers = {
            'Authorization': f'Bearer {card_token}',
            'Content-Type': 'application/json'
        }
        # L'API attend destination_user_id et operation (montant positif en centimes)
        data = {
            'destination_user_id': DEST_ID,
            'operation': int(amount * 100)  # Montant positif en centimes
        }
        
        print(f"DEBUG: Création transaction - Montant: {amount}€, Destination: {DEST_ID}")
        print(f"DEBUG: Token (10 premiers chars): {card_token[:10]}...")
        print(f"DEBUG: Headers: {headers}")
        print(f"DEBUG: Données envoyées: {data}")
        print(f"DEBUG: URL: {url}")
        
        response = requests.post(url, json=data, headers=headers, timeout=5)
        
        print(f"DEBUG: Réponse transaction - Code: {response.status_code}")
        print(f"DEBUG: Réponse brute: {response.text}")
        
        if response.status_code == 201:
            transaction_data = response.json()
            print(f"DEBUG: Transaction créée: {transaction_data}")
            
            # Récupérer le nouveau solde depuis l'API
            print(f"DEBUG: Récupération du nouveau solde...")
            balance_result = get_user_balance(card_token)
            
            if balance_result['success']:
                new_balance = balance_result['balance']
                print(f"DEBUG: Nouveau solde récupéré: {new_balance}€")
            else:
                print(f"DEBUG: Erreur récupération solde: {balance_result.get('error')}")
                # Utiliser le solde de la réponse transaction si disponible
                new_balance = float(transaction_data.get('newBalance', 0)) / 100.0
            
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
