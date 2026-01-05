#!/usr/bin/env python3

from smartcard.System import readers
from smartcard.Exceptions import NoCardException, CardConnectionException
from smartcard.util import toHexString
import time

SIZE_CARD_ID = 24
SIZE_PIN = 4
MAX_PIN_ATTEMPTS = 3

SIZE_CHALLENGE = 32
SIZE_SIGNATURE = 64

CMD_READ_CARD_ID = [0x80, 0x01, 0x00, 0x00, SIZE_CARD_ID]
CMD_READ_VERSION = [0x80, 0x02, 0x00, 0x00, 0x01]
CMD_VERIFY_PIN = [0x80, 0x06, 0x00, 0x00, SIZE_PIN]
CMD_SET_CHALLENGE = [0x80, 0x0C, 0x00, 0x00, SIZE_CHALLENGE]
CMD_SIGN_CHALLENGE = [0x80, 0x0B, 0x00, 0x00, SIZE_SIGNATURE]
CMD_CHECK_PIN_DEFINED = [0x80, 0x0E, 0x00, 0x00, 0x01]


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


def is_reader_connected(reader):
    try:
        r = readers()
        for available_reader in r:
            if str(available_reader) == str(reader):
                return True
        return False
    except Exception:
        return False


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

        data, sw1, sw2 = connection.transmit(cmd)

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
    try:
        if len(challenge_hex) != 8:
            return {
                'success': False,
                'error': f'Challenge must be 8 hex characters (got {len(challenge_hex)})'
            }

        challenge_bytes = bytes.fromhex(challenge_hex)

        cmd_set = CMD_SET_CHALLENGE + list(challenge_bytes)

        data, sw1, sw2 = connection.transmit(cmd_set)

        if sw1 != 0x90 or sw2 != 0x00:
            return {
                'success': False,
                'error': f'SET_CHALLENGE failed: SW1={hex(sw1)}, SW2={hex(sw2)}'
            }

        cmd_sign = CMD_SIGN_CHALLENGE

        data, sw1, sw2 = connection.transmit(cmd_sign)

        if sw1 == 0x6C:
            expected_size = sw2

            cmd_sign_with_size = [0x80, 0x0B, 0x00, 0x00, expected_size]
            data, sw1, sw2 = connection.transmit(cmd_sign_with_size)

        if sw1 == 0x90 and sw2 == 0x00:
            if len(data) > 0:
                signature = bytes(data)
                return {
                    'success': True,
                    'signature': signature
                }
            else:
                return {
                    'success': False,
                    'error': 'Empty signature received'
                }

        else:
            return {
                'success': False,
                'error': f'SIGN_CHALLENGE failed: SW1={hex(sw1)}, SW2={hex(sw2)}'
            }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def check_pin_defined(connection):
    try:
        data, sw1, sw2 = connection.transmit(CMD_CHECK_PIN_DEFINED)

        if sw1 == 0x90 and sw2 == 0x00:
            pin_defined = (data[0] == 0x01)
            return {
                'success': True,
                'pin_defined': pin_defined
            }
        else:
            return {
                'success': False,
                'error': f'Card error: SW1={hex(sw1)}, SW2={hex(sw2)}'
            }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
