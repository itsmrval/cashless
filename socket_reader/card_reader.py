#!/usr/bin/env python3

from smartcard.System import readers
from smartcard.Exceptions import NoCardException, CardConnectionException
from smartcard.util import toHexString
import time

SIZE_CARD_ID = 24
SIZE_PIN = 4
MAX_PIN_ATTEMPTS = 3

CMD_READ_CARD_ID = [0x80, 0x01, 0x00, 0x00, SIZE_CARD_ID]
CMD_READ_VERSION = [0x80, 0x02, 0x00, 0x00, 0x01]
CMD_VERIFY_PIN = [0x80, 0x06, 0x00, 0x00, SIZE_PIN]  # INS = 0x06 pour verify_pin
CMD_SIGN_CHALLENGE = [0x80, 0x08, 0x00, 0x00]  # INS = 0x08 pour sign_challenge
SIZE_CHALLENGE = 4
SIZE_SIGNATURE = 4


def wait_for_reader():    
    while True:
        try:
            r = readers()
            if len(r) > 0:
                print(f"Lecteur détecté: {r[0]}")
                return r[0]
        except Exception:
            pass
        time.sleep(2)


def check_card_present(reader):
    try:
        connection = reader.createConnection()
        connection.connect()
        # Petite pause pour stabiliser
        time.sleep(0.1)
        return connection
    except NoCardException:
        return None
    except CardConnectionException:
        return None
    except Exception:
        return None


def wait_for_card(reader):    
    while True:
        try:
            connection = reader.createConnection()
            connection.connect()
            return connection
        except NoCardException:
            time.sleep(0.5)
        except CardConnectionException:
            time.sleep(1)
        except Exception:
            time.sleep(1)


def read_card_id(connection):
    try:
        data, sw1, sw2 = connection.transmit(CMD_READ_CARD_ID)
        
        if sw1 == 0x90 and sw2 == 0x00:
            if all(b == 0 for b in data):
                return None
            card_id_str = ''.join(chr(b) for b in data if b != 0)
            return card_id_str
        else:
            return None  
    except Exception:
        return None


def read_version(connection):
    try:
        data, sw1, sw2 = connection.transmit(CMD_READ_VERSION)
        
        if sw1 == 0x90 and sw2 == 0x00 and len(data) > 0:
            version = data[0]
            return version
        else:
            return None
    except Exception:
        return None


def is_card_still_present(connection):
    try:
        data, sw1, sw2 = connection.transmit(CMD_READ_VERSION)
        return True
    except:
        return False


def verify_pin(connection, pin):
    try:
        if len(pin) != SIZE_PIN:
            return {
                'success': False,
                'attempts_remaining': None,
                'blocked': False,
                'error': f'PIN must be {SIZE_PIN} digits'
            }
        
        pin_bytes = [int(c) for c in pin]
        
        cmd = CMD_VERIFY_PIN + pin_bytes
        
        print(f"DEBUG: Envoi PIN - String: '{pin}' -> Bytes: {pin_bytes} -> CMD complète: {cmd}")
        
        data, sw1, sw2 = connection.transmit(cmd)
        
        print(f"DEBUG: Réponse - SW1: {hex(sw1)}, SW2: {hex(sw2)}, Data: {data}")
        
        if sw1 == 0x90 and sw2 == 0x00:
            return {
                'success': True,
                'attempts_remaining': MAX_PIN_ATTEMPTS,
                'blocked': False
            }
        
        elif sw1 == 0x63 and (sw2 & 0xF0) == 0xC0:
            attempts_remaining = sw2 & 0x0F
            return {
                'success': False,
                'attempts_remaining': attempts_remaining,
                'blocked': attempts_remaining == 0
            }
        
        elif sw1 == 0x69 and sw2 == 0x83:
            return {
                'success': False,
                'attempts_remaining': 0,
                'blocked': True
            }
        
        else:
            return {
                'success': False,
                'attempts_remaining': None,
                'blocked': False,
                'error': f'Unexpected status: SW1={hex(sw1)}, SW2={hex(sw2)}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'attempts_remaining': None,
            'blocked': False,
            'error': str(e)
        }


def sign_challenge(connection, challenge_hex):
    """
    Demande à la carte de signer un challenge.
    
    Args:
        connection: La connexion à la carte
        challenge_hex: Le challenge en hexadécimal (8 caractères = 4 bytes)
        
    Returns:
        dict: {'success': bool, 'signature': bytes, 'error': str}
    """
    try:
        # Convertir le challenge hex en bytes
        if len(challenge_hex) != 8:  # 4 bytes = 8 caractères hex
            return {
                'success': False,
                'error': f'Challenge must be 8 hex characters (got {len(challenge_hex)})'
            }
        
        challenge_bytes = bytes.fromhex(challenge_hex)
        
        # Construire la commande: CMD_SIGN_CHALLENGE + Lc (4) + challenge (4 bytes) + Le (4)
        cmd = CMD_SIGN_CHALLENGE + [SIZE_CHALLENGE] + list(challenge_bytes) + [SIZE_SIGNATURE]
        
        print(f"DEBUG: Envoi sign_challenge - Challenge hex: {challenge_hex} -> CMD: {cmd}")
        
        data, sw1, sw2 = connection.transmit(cmd)
        
        print(f"DEBUG: Réponse sign - SW1: {hex(sw1)}, SW2: {hex(sw2)}, Data length: {len(data)}, Data: {data}")
        
        if sw1 == 0x90 and sw2 == 0x00:
            if len(data) == SIZE_SIGNATURE:
                signature = bytes(data)
                print(f"DEBUG: Signature reçue: {signature.hex()}")
                return {
                    'success': True,
                    'signature': signature
                }
            else:
                return {
                    'success': False,
                    'error': f'Invalid signature length: expected {SIZE_SIGNATURE}, got {len(data)}'
                }
        
        else:
            return {
                'success': False,
                'error': f'Sign failed: SW1={hex(sw1)}, SW2={hex(sw2)}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
