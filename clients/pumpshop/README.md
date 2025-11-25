# Station Service Cashless - PumpShop

Interface de station service avec terminal de paiement électronique (TPE) interactif pour le système Cashless.

## Structure

```
pumpshop/
├── pump_api/          # Backend Python Flask + Socket.IO
│   ├── app.py         # Serveur principal
│   ├── card_reader.py # Gestion du lecteur de carte
│   └── requirements.txt
└── pump_front/        # Frontend React
    ├── public/
    ├── src/
    │   ├── App.jsx    # Composant principal
    │   ├── fuels.json # Configuration des carburants
    │   └── ...
    └── package.json
```

## Fonctionnalités

- **TPE interactif** avec clavier numérique fonctionnel
- **5 types de carburants** : SP95, SP98, E85, Diesel, Diesel+
- **Vérification PIN** sécurisée via la carte à puce
- **Animation de ravitaillement** en temps réel
- **Gestion du solde** et paiement instantané

## Installation

### Backend (API)

```bash
cd pump_api
pip install -r requirements.txt
python app.py
```

Le serveur démarre sur le port **8002**.

### Frontend

```bash
cd pump_front
npm install
npm start
```

L'interface démarre sur le port **3000**.

## Configuration

### Frontend

Créez un fichier `.env` à partir de `.env.example` :

```bash
cp .env.example .env
```

Variables disponibles :
- `REACT_APP_API_BASE_URL` : URL du backend (défaut: `http://localhost:8002`)

### Carburants

Les carburants sont configurables dans `src/fuels.json` :

```json
{
  "id": "sp95",
  "name": "Sans Plomb 95",
  "shortName": "SP95",
  "price": 1.789,
  "color": "#22c55e",
  "colorClass": "bg-green-500",
  "borderClass": "border-green-400",
  "icon": "⛽"
}
```

## Utilisation

1. **Insérer la carte** dans le lecteur physique
2. **Saisir le code PIN** sur le TPE à l'écran
3. **Sélectionner un carburant** parmi les pompes disponibles
4. **Entrer la quantité** en litres souhaitée
5. **Valider** avec le bouton OK
6. **Attendre** la fin du ravitaillement

## Boutons du TPE

| Bouton | Action |
|--------|--------|
| 0-9 | Saisie de chiffres |
| C | Effacer tout |
| ⌫ | Effacer dernier caractère |
| OK | Valider |
| ✕ | Annuler |

## Communication Socket.IO

### Événements reçus
- `card_inserted` : Carte détectée
- `card_removed` : Carte retirée
- `pin_verification_result` : Résultat de la vérification PIN

### Événements émis
- `verify_pin` : Demande de vérification du PIN
- `process_payment` : Demande de paiement

## Technologies

- **Frontend** : React 18, Tailwind CSS, Socket.IO Client
- **Backend** : Python 3, Flask, Flask-SocketIO, pyscard

## Licence

Projet Cashless - 2025
