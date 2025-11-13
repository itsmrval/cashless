"""
Module pour lire les cartes NFC via PC/SC
Équivalent Python du driver C card.c
"""

from smartcard.System import readers
from smartcard.Exceptions import NoCardException, CardConnectionException
import logging
import time

logger = logging.getLogger(__name__)

SIZE_CARD_ID = 24
SIZE_PIN = 4

class CardReader:
    def __init__(self):
        self.connection = None
        self.reader = None
        self.initialize()
    
    def initialize(self):
        """Initialise le lecteur de carte"""
        try:
            available_readers = readers()
            if not available_readers:
                logger.warning("Aucun lecteur de carte détecté")
                return False
            
            self.reader = available_readers[0]
            logger.info(f"Lecteur de carte trouvé: {self.reader}")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation du lecteur: {e}")
            return False
    
    def wait_for_card(self, timeout=None):
        """
        Attend qu'une carte soit présente sur le lecteur
        
        Args:
            timeout: Temps d'attente maximum en secondes (None = infini)
        
        Returns:
            str: L'ID de la carte ou None si timeout
        """
        if not self.reader:
            logger.error("Aucun lecteur de carte disponible")
            return None
        
        logger.info("En attente d'une carte...")
        start_time = time.time()
        
        while True:
            try:
                # Vérifier le timeout
                if timeout and (time.time() - start_time) > timeout:
                    logger.info("Timeout atteint lors de l'attente de carte")
                    return None
                
                # Tenter de se connecter à la carte
                self.connection = self.reader.createConnection()
                self.connection.connect()
                
                # Carte détectée, lire l'ID
                card_id = self.read_card_id()
                if card_id:
                    logger.info(f"Carte détectée: {card_id}")
                    return card_id
                
            except NoCardException:
                # Pas de carte présente, attendre un peu
                time.sleep(0.5)
            except CardConnectionException as e:
                logger.warning(f"Erreur de connexion à la carte: {e}")
                time.sleep(0.5)
            except Exception as e:
                logger.error(f"Erreur inattendue lors de la lecture de carte: {e}")
                time.sleep(1)
    
    def is_card_present(self):
        """Vérifie si une carte est présente"""
        if not self.connection:
            return False
        
        try:
            # Essayer d'envoyer une commande simple pour vérifier la présence
            atr = self.connection.getATR()
            return atr is not None
        except:
            return False
    
    def read_card_id(self):
        """
        Lit l'ID de la carte
        
        Returns:
            str: L'ID de la carte en format hexadécimal
        """
        if not self.connection:
            logger.error("Pas de connexion à la carte")
            return None
        
        try:
            # Commande APDU pour lire l'ID de la carte (même que dans card.c)
            # Format: CLA INS P1 P2 Le
            cmd_read_id = [0x80, 0x01, 0x00, 0x00, SIZE_CARD_ID]
            
            # Envoyer la commande
            response, sw1, sw2 = self.connection.transmit(cmd_read_id)
            
            # Vérifier le statut (0x90 0x00 = succès)
            if sw1 == 0x90 and sw2 == 0x00:
                # Convertir la réponse en chaîne hexadécimale
                card_id = ''.join([f'{b:02x}' for b in response])
                return card_id.rstrip('0')  # Enlever les zéros de padding
            else:
                logger.error(f"Erreur lors de la lecture de l'ID: SW1={sw1:02x} SW2={sw2:02x}")
                return None
                
        except Exception as e:
            logger.error(f"Erreur lors de la lecture de l'ID de carte: {e}")
            return None
    
    def verify_pin(self, pin):
        """
        Vérifie le code PIN sur la carte
        
        Args:
            pin: Code PIN à vérifier (4 chiffres)
        
        Returns:
            tuple: (success: bool, remaining_attempts: int)
        """
        if not self.connection:
            logger.error("Pas de connexion à la carte")
            return False, 0
        
        try:
            # Préparer la commande de vérification du PIN
            # Format: CLA INS P1 P2 Lc DATA
            pin_bytes = [ord(c) for c in pin]
            cmd_verify_pin = [0x80, 0x03, 0x00, 0x00, SIZE_PIN] + pin_bytes
            
            # Envoyer la commande
            response, sw1, sw2 = self.connection.transmit(cmd_verify_pin)
            
            # 0x90 0x00 = PIN correct
            if sw1 == 0x90 and sw2 == 0x00:
                return True, 3
            
            # 0x63 0xCX = PIN incorrect, X tentatives restantes
            if sw1 == 0x63 and (sw2 & 0xF0) == 0xC0:
                remaining = sw2 & 0x0F
                logger.warning(f"PIN incorrect, {remaining} tentative(s) restante(s)")
                return False, remaining
            
            logger.error(f"Erreur lors de la vérification du PIN: SW1={sw1:02x} SW2={sw2:02x}")
            return False, 0
            
        except Exception as e:
            logger.error(f"Erreur lors de la vérification du PIN: {e}")
            return False, 0
    
    def disconnect(self):
        """Déconnecte la carte"""
        if self.connection:
            try:
                self.connection.disconnect()
                logger.info("Carte déconnectée")
            except:
                pass
            self.connection = None
    
    def cleanup(self):
        """Nettoie les ressources"""
        self.disconnect()


# Instance globale du lecteur de carte
_card_reader = None

def get_card_reader():
    """Retourne l'instance globale du lecteur de carte"""
    global _card_reader
    if _card_reader is None:
        _card_reader = CardReader()
    return _card_reader

def wait_for_card_scan(timeout=None):
    """
    Fonction utilitaire pour attendre une carte
    
    Args:
        timeout: Temps d'attente maximum en secondes
    
    Returns:
        str: L'ID de la carte ou None
    """
    reader = get_card_reader()
    return reader.wait_for_card(timeout)
