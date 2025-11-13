# Coffee Front - Distributeur de café

Interface React pour le système de distributeur de café cashless.

## Technologies

- **React 18** - Framework UI
- **React Scripts** - Build tool et dev server
- **Tailwind CSS** - Framework CSS utilitaire
- **Axios** - Client HTTP pour l'API

## Fonctionnalités

- 🎫 Scanner de carte utilisateur
- 👤 Affichage des informations utilisateur (nom, solde)
- ☕ Menu de produits (café, thé, eau chaude)
- 🛒 Panier d'achat
- 🔐 Vérification du code PIN à 4 chiffres
- 💳 Traitement des paiements
- ✅ Messages de confirmation et d'erreur

## Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Modifier .env avec l'URL de votre API Python
# REACT_APP_API_BASE_URL=http://localhost:5000
```

## Développement

```bash
# Lancer le serveur de développement
npm start

# L'application sera accessible sur http://localhost:3000
```

## Build

```bash
# Créer une version de production
npm run build

# Prévisualiser la version de production
npm run preview
```

## Docker

```bash
# Build de l'image
docker build -t coffee-front .

# Lancer le conteneur
docker run -p 3001:3001 -e REACT_APP_API_BASE_URL=http://localhost:5000 coffee-front
```

## Utilisation

1. **Scanner la carte** : Entrez l'ID de la carte utilisateur
2. **Voir les informations** : Le nom et le solde de l'utilisateur s'affichent
3. **Sélectionner des produits** : Cliquez sur les produits du menu pour les ajouter au panier
4. **Payer** : Cliquez sur "Payer" dans le panier
5. **Entrer le PIN** : Saisissez le code PIN à 4 chiffres
6. **Confirmation** : Le paiement est traité et le solde mis à jour

## Structure du projet

```
coffee_front/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   └── coffeeApi.js          # Client API
│   ├── components/
│   │   ├── Cart.jsx               # Composant panier
│   │   ├── Menu.jsx               # Composant menu
│   │   ├── PinVerification.jsx   # Modal de vérification PIN
│   │   ├── ProductCard.jsx       # Carte produit
│   │   └── UserInfo.jsx          # Informations utilisateur
│   ├── App.jsx                    # Composant principal
│   ├── index.js                   # Point d'entrée
│   └── index.css                  # Styles globaux
├── package.json
├── tailwind.config.js
└── Dockerfile
```

## Configuration API

Le frontend communique avec l'API Python `coffee_api` pour :

- Récupérer le menu : `GET /menu`
- Obtenir les infos utilisateur : `GET /user/{card_id}`
- Vérifier le PIN : `POST /verify-pin`
- Traiter les paiements : `POST /payment`

**Note** : Les endpoints `/verify-pin` et `/payment` doivent être implémentés dans l'API Python.

## Variables d'environnement

- `REACT_APP_API_BASE_URL` : URL de base de l'API Python (défaut: `http://localhost:5000`)

## Personnalisation

### Couleurs

Les couleurs peuvent être modifiées dans `tailwind.config.js` :

```js
colors: {
  'coffee': {
    50: '#fdf8f6',
    // ... autres nuances
    900: '#43302b',
  }
}
```

### Menu

Les produits sont récupérés dynamiquement depuis l'API Python.
