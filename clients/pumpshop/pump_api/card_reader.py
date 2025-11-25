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
CMD_VERIFY_PIN = [0x80, 0x06, 0x00, 0x00, SIZE_PIN]


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
