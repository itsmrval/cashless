# Coffee API - Backend Python pour distributeur de café

API Flask pour gérer un distributeur de café cashless avec lecture de cartes NFC.

## Fonctionnalités

- 🎫 Lecture automatique des cartes NFC via PC/SC
- 👤 Récupération des informations utilisateur
- ☕ Gestion du menu de produits
- 🔐 Vérification du PIN sur la carte physique
- 💳 Traitement des paiements

## Prérequis

### macOS

```bash
# Installer les dépendances système pour pyscard
brew install swig pcsc-lite

# Note: PC/SC est déjà installé par défaut sur macOS
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install python3-pip swig pcscd libpcsclite-dev
sudo systemctl start pcscd
sudo systemctl enable pcscd
```

### Windows

1. Télécharger et installer [SWIG](http://www.swig.org/download.html)
2. Ajouter SWIG au PATH
3. Les pilotes PC/SC sont généralement déjà installés

## Installation

```bash
# Créer un environnement virtuel (recommandé)
python3 -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installer les dépendances Python
pip install -r requirements.txt
```

## Configuration

Créer un fichier `.env` ou définir les variables d'environnement :

```bash
API_BASE_URL=http://localhost:3000/v1  # URL de l'API Node.js principale
PORT=5000                               # Port pour l'API Flask
```

## Utilisation

### Lancer l'API

```bash
python3 api.py
```

L'API sera accessible sur `http://localhost:5000`

### Tester la lecture de carte

```bash
# Tester si le lecteur de carte est détecté
python3 -c "from card_reader import get_card_reader; reader = get_card_reader(); print('Lecteur OK' if reader.reader else 'Pas de lecteur')"

# Attendre une carte (timeout 10 secondes)
python3 -c "from card_reader import wait_for_card_scan; print(wait_for_card_scan(10))"
```

## Endpoints API

### `GET /health`
Vérification de l'état de l'API

### `GET /wait-card?timeout=30`
Attend qu'une carte soit posée sur le lecteur (bloquant)
- **Paramètres** : `timeout` - Temps d'attente en secondes (défaut: 30)
- **Réponse** : `{"success": true, "card_id": "abc123..."}`

### `GET /current-card`
Récupère l'ID de la dernière carte scannée

### `GET /menu`
Récupère le menu des produits disponibles

### `GET /user/<card_id>`
Récupère les informations de l'utilisateur associé à une carte

### `POST /verify-pin`
Vérifie le PIN sur la carte physique ou via l'API
```json
{
  "card_id": "abc123",
  "pin": "1234"
}
```

### `POST /payment`
Traite un paiement
```json
{
  "card_id": "abc123",
  "items": [...],
  "total_amount": 5.50,
  "pin": "1234"
}
```

## Architecture

```
coffee_api/
├── api.py              # Application Flask principale
├── card_reader.py      # Module de lecture de cartes NFC
├── requirements.txt    # Dépendances Python
└── README.md          # Documentation
```

## Flux de fonctionnement

1. **Attente de carte** : L'API attend qu'une carte soit posée sur le lecteur
2. **Lecture de l'ID** : L'ID de la carte est lu via PC/SC
3. **Récupération utilisateur** : Les infos utilisateur sont récupérées depuis l'API Node.js
4. **Sélection produits** : L'utilisateur sélectionne des produits dans le menu
5. **Vérification PIN** : Le PIN est vérifié sur la carte physique
6. **Paiement** : Le compte est débité via l'API Node.js

## Dépendances

- **Flask** : Framework web Python
- **flask-cors** : Gestion CORS
- **requests** : Client HTTP
- **pyscard** : Interface Python pour PC/SC (lecture de cartes)

## Dépannage

### Erreur "No readers available"

```bash
# Vérifier que le daemon PC/SC est actif (Linux)
sudo systemctl status pcscd

# Lister les lecteurs disponibles
pcsc_scan
```

### Erreur lors de l'installation de pyscard

```bash
# macOS : Installer SWIG
brew install swig

# Linux : Installer les dépendances
sudo apt-get install swig libpcsclite-dev
```

### La carte n'est pas détectée

1. Vérifier que le lecteur est bien connecté
2. Vérifier que la carte est compatible PC/SC
3. Tester avec `pcsc_scan` pour voir si la carte est détectée au niveau système

## Développement

### Mode debug

L'API est en mode debug par défaut. Pour désactiver :

```python
app.run(host='0.0.0.0', port=PORT, debug=False)
```

### Logs

Les logs sont affichés dans la console avec le niveau INFO. Pour plus de détails :

```python
logging.basicConfig(level=logging.DEBUG)
```

## Docker

```bash
# Build
docker build -t coffee-api .

# Run (nécessite l'accès au lecteur de carte)
docker run --privileged -p 5000:5000 \
  -e API_BASE_URL=http://host.docker.internal:3000/v1 \
  coffee-api
```

**Note** : L'accès aux périphériques USB/PC/SC depuis Docker peut nécessiter des configurations spécifiques selon le système.

## Sécurité

⚠️ **Important** :
- Le PIN est vérifié directement sur la carte physique quand disponible
- Communication avec l'API Node.js en HTTP (utiliser HTTPS en production)
- Les transactions sont loguées pour audit

## Licence

Projet interne - Tous droits réservés
