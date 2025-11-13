# Cashless — Documentation du frontend

Ce document décrit l'architecture, l'installation, le développement et le déploiement de l'application frontend située dans `front/`.

**Objectif** : interface client pour la gestion d'une carte Cashless (connexion, tableau de bord, transactions, gestion de la carte).

**Technologies principales** : React 18, Tailwind CSS, Webpack, Babel, `lucide-react` pour les icônes.

--

**Table des matières**
- **Prérequis**
- **Installation & exécution**
- **Configuration (variables & API)**
- **Structure du projet**
- **Composants clés**
- **Endpoints API utilisés**
- **Scripts utiles**
- **Déploiement / Docker**
- **Tests & vérifications rapides**
- **Debug / dépannage**
- **Contribuer**

--

**Prérequis**
- Node.js >= 16
- npm (ou pnpm/yarn — la doc ci-dessous utilise `npm`)
- L'API backend doit être accessible (par défaut sur `http://localhost:3001`)

--

**Installation**

1. Installer les dépendances :

```bash
cd front
npm install
```

2. (optionnel) Installer la bibliothèque d'icônes si nécessaire :

```bash
npm i lucide-react
```

--

**Exécution en développement**

```bash
cd front
npm run dev
```

L'application est servie par Webpack Dev Server (par défaut `http://localhost:3000`).

--

**Build de production**

```bash
npm run build
```

Les fichiers optimisés seront générés dans `dist/` (ou le dossier configuré dans `webpack.config.js`).

--

**Configuration**

- URL de l'API : constante `API_BASE_URL` dans `src/api.js`. Par défaut `http://localhost:3001`.
- Si vous déployez derrière un proxy ou changez de port, mettez à jour cette valeur ou utilisez un fichier `.env` géré par Webpack si nécessaire.

--

**Structure du projet (important pour contributeurs)**

`front/`
- `public/` : index HTML et assets statiques
- `src/` : code source
	- `index.js` : point d'entrée
	- `App.jsx` : routeur / wrapper principal
	- `api.js` : fonctions centralisées d'appel à l'API (fetch/axios)
	- `index.css` : Tailwind build
	- `components/`
		- `layout/` : composants de mise en page
			- `MainLayout.jsx` — structure principale (Header + Sidebar + content)
			- `Header.jsx` — barre supérieure
			- `Sidebar.jsx` — navigation principale
		- `dashboard/` : composants du tableau de bord
			- `AccountOverview.jsx` — vue synthèse du compte (solde, infos carte)
			- `TransactionsList.jsx` — liste et détails des opérations
			- `CardManagement.jsx` — actions sur la carte (bloquer, débloquer, commentaires)
		- `Login.jsx` — écran d'authentification
		- `Dashboard.jsx` — page principale combinant les composants dashboard

Notes : quelques fichiers de la racine `components/` peuvent être des ré-exports vers les dossiers `layout/` et `dashboard/` (ex : `Header.jsx`, `Sidebar.jsx`) pour maintenir les imports existants.

--

**Composants clés — détails & responsabilités**

- `src/components/Login.jsx`
	- Formulaire de connexion. Envoie `POST /v1/user/login` via `src/api.js`.
	- Affiche erreurs spécifiques (identifiants invalides, carte bloquée, etc.).

- `src/components/layout/MainLayout.jsx`
	- Conteneur principal du site avec `Header`, `Sidebar` et zone de contenu.

- `src/components/layout/Header.jsx`
	- Affiche l'état utilisateur, bouton déconnexion, raccourcis et actions globales.

- `src/components/layout/Sidebar.jsx`
	- Navigation verticale vers Dashboard, Transactions, Ma carte, etc.

- `src/components/dashboard/AccountOverview.jsx`
	- Affiche solde (démo), numéro de carte masqué, titulaire, statut de la carte et métadonnées.

- `src/components/dashboard/TransactionsList.jsx`
	- Liste paginée/filtrable des transactions. Utilise l'API (ou données factices si l'API n'expose pas encore de transactions).

- `src/components/dashboard/CardManagement.jsx`
	- Permet de mettre à jour le statut de la carte (`active`, `inactive`, `waiting_activation`, `blocked`) via `PATCH /v1/card/:card_id`.
	- Gère blocage/déblocage et commentaires d'administration.

- `src/api.js`
	- Centralise les appels fetch/axios, gère la base URL et les erreurs génériques.
	- Vérifie le statut de la carte à la réception d'un login : une carte avec `status === 'blocked'` renvoie une erreur (403) côté serveur ; le frontend affiche un message clair.

--

**Endpoints (backend utilisés par le frontend)**

- `POST /v1/user/login` — connexion (body : `{ username, password }` ou `{ card_id, puk }` suivant implémentation)
- `GET /v1/card/:card_id` — récupérer les informations d'une carte
- `GET /v1/user?card_id=:id` — récupérer les données utilisateur liées à une carte
- `PATCH /v1/card/:card_id` — mettre à jour la carte (statut, commentaire)
- Admin/dev_front (si utilisé) : `/dev_front` lives in `/dev_front/react` and uses separate endpoints like `POST /v1/card` or `/v1/card/:id/assign` (vérifier le contrôleur correspondant)

--

**Scripts utiles (dans `front/package.json`)**

- `npm run dev` — démarre le serveur de développement
- `npm run build` — build production (génère `dist/`)
- `npm run lint` — (si présent) lint du code

--

**Déploiement & Docker**

- Pour l'app `front` en dev, vous pouvez utiliser `npm run dev` localement.
- Le panneau admin (dev_front) est containerisé via `dev_front/Dockerfile` et a un flux de build multi-stage (Node -> nginx). Si vous souhaitez containeriser `front` : créez un Dockerfile multi-stage similaire.

Exemple de commandes Docker Compose (depuis la racine du repo) :

```bash
# Reconstruire et démarrer les services (api, dev_front, etc.)
docker-compose build --no-cache
docker-compose up -d
```

--

**Tests & vérifications rapides**

1. Lancer le serveur dev :

```bash
cd front
npm run dev
```

2. Vérifier la page de login (`http://localhost:3000`) et tenter une connexion.
3. Ouvrir la console du navigateur pour voir les requêtes réseau vers `API_BASE_URL`.

--

**Dépannage courant**

- Erreur : `Cannot GET /` ou page blanche — vérifier que Webpack Dev Server tourne (`npm run dev`) et que `public/index.html` existe.
- Erreur lors du build Docker (COPY package-lock.json introuvable) — retirez la référence à `package-lock.json` ou générez-le (`npm install` crée le fichier).
- Import manquant après suppression de fichiers — lancer :

```bash
rg "NomDuComposant" -n src || echo "Aucune référence trouvée"
```

--

**Bonnes pratiques & notes pour contributeurs**

- Garder la logique réseau dans `src/api.js` pour centraliser la gestion des erreurs et le `API_BASE_URL`.
- Les composants UI (layout/dashboard) sont pensés pour être réutilisables et découplés de la logique métier.
- Avant de supprimer un composant, faire une recherche globale d'imports (`rg`/`grep`) pour éviter de casser des imports résiduels.

--