#!/usr/bin/env python3

import requests
import base64
import json
import os
import logging
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


def create_transaction(card_token, card_id, amount, merchant_name):
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
        data = {
            'destination_user_id': DEST_ID,
            'operation': int(amount * 100)
        }
        
        logger.info(f"Demande - Montant: {amount}€")
        
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
