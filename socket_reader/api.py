#!/usr/bin/env python3

import requests
import base64
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv('API_BASE_URL', 'https://api.cashless.iut.valentinp.fr/v1')


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
    
    Args:
        card_id: L'identifiant de la carte
        pin: Le code PIN (4 chiffres)
        
    Returns:
        dict: {'success': bool, 'token': str, 'error': str}
    """
    try:
        url = f"{API_BASE_URL}/auth/card"
        headers = {'Content-Type': 'application/json'}
        data = {
            'card_id': card_id,
            'pin': pin
        }
        
        response = requests.post(url, json=data, headers=headers, timeout=5)
        
        if response.status_code == 200:
            response_data = response.json()
            if 'token' in response_data:
                return {
                    'success': True,
                    'token': response_data['token']
                }
        
        return {
            'success': False,
            'error': f'Authentication failed: {response.status_code}'
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
        
        response = requests.get(url, params=params, headers=headers, timeout=5)
        
        if response.status_code != 200:
            return {
                'success': False,
                'error': f'Failed to fetch user: {response.status_code}'
            }
        
        user_data = response.json()
        
        if 'firstName' not in user_data or 'id' not in user_data:
            return {
                'success': False,
                'error': 'Invalid user data received'
            }
        
        user_id = user_data['id']
        first_name = user_data['firstName']
        
        # Récupérer le balance
        balance_url = f"{API_BASE_URL}/user/{user_id}/balance"
        balance_response = requests.get(balance_url, headers=headers, timeout=5)
        
        if balance_response.status_code != 200:
            return {
                'success': False,
                'error': f'Failed to fetch balance: {balance_response.status_code}'
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


def create_transaction(card_token, amount, merchant_name):
    """
    Crée une transaction (paiement).
    
    Args:
        card_token: Le token d'authentification de la carte
        amount: Le montant en euros
        merchant_name: Le nom du marchand
        
    Returns:
        dict: {'success': bool, 'transaction_id': str, 'new_balance': float, 'error': str}
    """
    try:
        url = f"{API_BASE_URL}/transactions"
        headers = {
            'Authorization': f'Bearer {card_token}',
            'Content-Type': 'application/json'
        }
        data = {
            'amount': int(amount * 100),  # Convertir euros en centimes
            'merchant': merchant_name
        }
        
        response = requests.post(url, json=data, headers=headers, timeout=5)
        
        if response.status_code == 201:
            transaction_data = response.json()
            return {
                'success': True,
                'transaction_id': transaction_data.get('id'),
                'new_balance': float(transaction_data.get('newBalance', 0)) / 100.0
            }
        
        return {
            'success': False,
            'error': f'Transaction failed: {response.status_code}'
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
