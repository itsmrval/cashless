# Cashless — Documentation du frontend

Ce document décrit l'architecture, l'installation, le développement et le déploiement de l'application frontend située dans `website/`.

**Objectif** : interface utilisateur et administration pour la gestion d'un système Cashless (connexion, tableau de bord utilisateur, administration des cartes et utilisateurs, gestion des transactions).

**Technologies principales** : React 18, React Router v7, Tailwind CSS, Webpack 5, Babel, `lucide-react` pour les icônes.

--

**Table des matières**
- **Prérequis**
- **Installation & exécution**
- **Configuration (variables & API)**
- **Structure du projet**
- **Architecture de routing**
- **Composants clés**
- **Endpoints API utilisés**
- **Scripts utiles**
- **Déploiement**
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
cd website
npm install
```

--

**Exécution en développement**

```bash
cd website
npm run dev
```

L'application est servie par Webpack Dev Server (par défaut `http://localhost:8080` avec `--open`).

--

**Build de production**

```bash
npm run build
```

Les fichiers optimisés seront générés dans `dist/` (ou le dossier configuré dans `webpack.config.js`).

--

**Configuration**

- URL de l'API : configuration dans `src/api.js` ou `src/api/api.js`. Par défaut `http://localhost:3001`.
- Si vous déployez derrière un proxy ou changez de port, mettez à jour cette valeur ou utilisez un fichier `.env` géré par Webpack si nécessaire.

--

**Structure du projet (important pour contributeurs)**

`website/`
- `public/` : index HTML et assets statiques
- `src/` : code source
	- `index.js` / `main.jsx` : point d'entrée de l'application
	- `App.jsx` : routeur principal avec routes protégées et routes admin
	- `api.js` / `api/api.js` : fonctions centralisées d'appel à l'API
	- `index.css` : configuration Tailwind CSS
	- `contexts/`
		- `AuthContext.jsx` — contexte d'authentification global
	- `layouts/` : layouts principaux
		- `UserLayout.jsx` — layout pour utilisateurs standards
		- `AdminLayout.jsx` — layout pour l'administration
	- `components/` : composants réutilisables
		- `Login.jsx` — formulaire de connexion
		- `Dashboard.jsx` — tableau de bord utilisateur
		- `Header.jsx` — barre supérieure
		- `Sidebar.jsx` — navigation latérale
		- `MainLayout.jsx` — layout principal
		- `AccountOverview.jsx` — vue synthèse du compte
		- `TransactionsList.jsx` — liste des transactions
		- `CardManagement.jsx` — gestion de la carte
		- `AdminUserManagement.jsx` — gestion admin des utilisateurs
		- `BeneficiariesManager.jsx` — gestion des bénéficiaires
		- `Settings.jsx` / `SettingsModal.jsx` — paramètres utilisateur
		- `Pagination.jsx` — composant de pagination
		- `cards/`
			- `CardItem.jsx` — affichage d'une carte
			- `CardList.jsx` — liste de cartes
	- `pages/` : pages principales
		- `LoginPage.jsx` — page de connexion
		- `admin/`
			- `AdminDashboard.jsx` — tableau de bord admin
			- `AdminCardManagement.jsx` — gestion des cartes (admin)
			- `AdminTransactions.jsx` — transactions (admin)
	- `routes/` : composants de routing
		- `ProtectedRoute.jsx` — route protégée (authentification requise)
		- `AdminRoute.jsx` — route admin (authentification + droits admin requis)

--

**Architecture de routing**

L'application utilise React Router v7 avec deux layouts principaux :

**Routes utilisateur** (`/`)
- Protected par `ProtectedRoute` (authentification requise)
- Layout : `UserLayout`
- Routes disponibles :
	- `/` — Dashboard utilisateur
	- `/transactions` — Transactions
	- `/beneficiaries` — Bénéficiaires
	- `/card` — Gestion de la carte
	- `/settings` — Paramètres

**Routes admin** (`/admin`)
- Protected par `AdminRoute` (authentification + droits admin requis)
- Layout : `AdminLayout`
- Routes disponibles :
	- `/admin` — Dashboard admin
	- `/admin/users` — Gestion des utilisateurs
	- `/admin/cards` — Gestion des cartes
	- `/admin/transactions` — Transactions globales

--

**Composants clés — détails & responsabilités**

- `src/contexts/AuthContext.jsx`
	- Contexte global de gestion de l'authentification
	- Fournit `isAuthenticated`, `isAdmin`, `login`, `logout`
	- Persiste l'état utilisateur

- `src/pages/LoginPage.jsx`
	- Page de connexion principale
	- Formulaire de connexion. Envoie `POST /v1/user/login` via l'API
	- Affiche erreurs spécifiques (identifiants invalides, carte bloquée, etc.)

- `src/layouts/UserLayout.jsx`
	- Layout principal pour les utilisateurs standards
	- Contient navigation et zone de contenu avec `<Outlet />`

- `src/layouts/AdminLayout.jsx`
	- Layout principal pour l'interface d'administration
	- Navigation admin et zone de contenu

- `src/components/Header.jsx`
	- Barre supérieure avec état utilisateur, bouton déconnexion
	- Raccourcis et actions globales

- `src/components/Sidebar.jsx`
	- Navigation verticale vers Dashboard, Transactions, Ma carte, etc.

- `src/components/Dashboard.jsx`
	- Page principale du tableau de bord utilisateur
	- Combine AccountOverview, TransactionsList, CardManagement

- `src/components/AccountOverview.jsx`
	- Affiche solde, numéro de carte masqué, titulaire, statut de la carte

- `src/components/TransactionsList.jsx`
	- Liste paginée/filtrable des transactions
	- Utilise le composant Pagination

- `src/components/CardManagement.jsx`
	- Permet de mettre à jour le statut de la carte via `PATCH /v1/card/:card_id`
	- Gère blocage/déblocage et commentaires

- `src/components/AdminUserManagement.jsx`
	- Interface d'administration des utilisateurs
	- CRUD utilisateurs

- `src/pages/admin/AdminCardManagement.jsx`
	- Gestion administrative des cartes
	- Vue globale de toutes les cartes du système

- `src/api.js` / `src/api/api.js`
	- Centralise les appels API (fetch)
	- Gère la base URL et les erreurs génériques
	- Vérifie le statut de la carte : une carte avec `status === 'blocked'` renvoie une erreur (403) côté serveur

--

**Endpoints API utilisés**

L'application communique avec le backend via les endpoints suivants :

**Authentification**
- `POST /v1/user/login` — connexion utilisateur/admin (body : `{ username, password }` ou `{ card_id, puk }`)

**Cartes**
- `GET /v1/card/:card_id` — récupérer les informations d'une carte
- `PATCH /v1/card/:card_id` — mettre à jour une carte (statut, commentaire, etc.)
- `POST /v1/card` — créer une nouvelle carte (admin)
- `GET /v1/cards` — liste de toutes les cartes (admin)

**Utilisateurs**
- `GET /v1/user?card_id=:id` — récupérer les données utilisateur liées à une carte
- `GET /v1/users` — liste de tous les utilisateurs (admin)
- `POST /v1/user` — créer un nouvel utilisateur (admin)
- `PATCH /v1/user/:user_id` — mettre à jour un utilisateur (admin)

**Transactions**
- `GET /v1/transactions?card_id=:id` — récupérer les transactions d'une carte
- `GET /v1/transactions` — toutes les transactions (admin)

**Bénéficiaires**
- `GET /v1/beneficiaries?card_id=:id` — liste des bénéficiaires d'une carte
- `POST /v1/beneficiary` — ajouter un bénéficiaire
- `DELETE /v1/beneficiary/:id` — supprimer un bénéficiaire

--

**Scripts utiles (dans `website/package.json`)**

- `npm run dev` — démarre le serveur de développement avec Webpack Dev Server (ouvre automatiquement le navigateur)
- `npm start` — alias pour démarrer en mode développement (sans `--open`)
- `npm run build` — build production (génère `dist/`)

--

**Déploiement**

**Développement local**
```bash
cd website
npm install
npm run dev
```

**Build pour production**
```bash
cd website
npm run build
```

Les fichiers statiques seront générés dans `dist/` et peuvent être servis par n'importe quel serveur web (nginx, Apache, etc.).

**Docker** (optionnel)
Pour containeriser l'application, créez un Dockerfile multi-stage similaire à celui de `dev_front/` :
1. Stage 1 : Build avec Node.js
2. Stage 2 : Servir avec nginx

Exemple de commandes Docker Compose (depuis la racine du repo) :
```bash
docker-compose build --no-cache
docker-compose up -d
```

--

**Tests & vérifications rapides**

1. Lancer le serveur dev :
```bash
cd website
npm run dev
```

2. Vérifier la page de login (ouvre automatiquement dans le navigateur ou accéder à `http://localhost:8080`)
3. Tester la connexion avec des identifiants valides
4. Vérifier les routes protégées (redirect vers `/login` si non authentifié)
5. Tester l'accès admin avec un compte administrateur
6. Ouvrir la console du navigateur pour voir les requêtes réseau vers l'API

**Vérifications de build**
```bash
npm run build
# Vérifier que dist/ contient les fichiers générés
ls -la dist/
```

--

**Dépannage courant**

**Erreur : `Cannot GET /` ou page blanche**
- Vérifier que Webpack Dev Server tourne (`npm run dev`)
- Vérifier que `public/index.html` existe
- Consulter la console du navigateur pour les erreurs JS

**Erreur : API non accessible**
- Vérifier que le backend tourne sur `http://localhost:3001`
- Vérifier la configuration de `API_BASE_URL` dans `src/api.js`
- Consulter l'onglet Network des DevTools pour voir les requêtes échouées

**Erreur : Module not found**
- Lancer `npm install` pour réinstaller les dépendances
- Vérifier les imports dans les fichiers JS/JSX

**Import manquant après suppression de fichiers**
```bash
cd website
rg "NomDuComposant" -n src || echo "Aucune référence trouvée"
```

**Problèmes de routing**
- Les routes protégées redirigent vers `/login` si non authentifié
- Les routes admin redirigent vers `/` si l'utilisateur n'est pas admin
- Vérifier le contexte `AuthContext` pour l'état d'authentification

**Erreur lors du build**
- Supprimer `node_modules/` et `dist/`, puis relancer :
```bash
rm -rf node_modules dist
npm install
npm run build
```

--

**Bonnes pratiques & notes pour contributeurs**

**Architecture**
- Garder la logique réseau dans `src/api.js` ou `src/api/api.js` pour centraliser la gestion des erreurs
- Utiliser le contexte `AuthContext` pour tous les besoins d'authentification
- Les composants UI sont découplés de la logique métier pour être réutilisables

**Routing**
- Utiliser `ProtectedRoute` pour les routes nécessitant une authentification
- Utiliser `AdminRoute` pour les routes nécessitant des droits admin
- Les layouts (`UserLayout`, `AdminLayout`) encapsulent la structure commune

**Composants**
- Avant de supprimer un composant, faire une recherche globale d'imports (`rg`/`grep`)
- Privilégier les composants fonctionnels avec hooks React
- Utiliser Tailwind CSS pour le styling (éviter le CSS inline ou les fichiers .css supplémentaires)

**API**
- Tous les appels API passent par `src/api.js` pour une gestion centralisée
- Gérer les erreurs de manière cohérente (codes 401, 403, 404, etc.)
- Utiliser des tokens/sessions pour l'authentification persistante

**État**
- Utiliser React Context pour l'état global (authentification, thème, etc.)
- Utiliser useState/useEffect pour l'état local des composants
- Considérer l'ajout d'un state manager (Redux, Zustand) si l'état devient complexe

--