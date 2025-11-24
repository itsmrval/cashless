# Documentation API — Backend Express (dossier `api`)

Ce document explique les endpoints exposés par le backend Express situé dans le dossier `api/` du projet.
Il décrit les chemins, méthodes, formats de requête/réponse, l'authentification attendue et des exemples pour connecter le frontend.

Base path
---------
L'application utilise le préfixe d'URL suivant pour les routes :

/v1

Par exemple : `https://<HOST>:<PORT>/v1/auth/login`.

Authentification
----------------
- Les tokens JWT sont envoyés via l'en-tête HTTP `Authorization: Bearer <token>`.
- Deux types de token sont utilisés :
  - Token "user" (généré par `POST /v1/auth/login`) — contient userId, username, role et expire après 24h.
  - Token "card" (généré par `POST /v1/auth/card`) — contient cardId et type: 'card', expire après 1h.
- Middleware disponible :
  - `verifyJWT` : valide un token utilisateur (attend un user token).
  - `verifyCardToken` : valide un token carte (type 'card').
  - `verifyAny` : accepte un token utilisateur ou carte et expose req.user ou req.card.

Formats généraux
----------------
- Toutes les requêtes attendent JSON et renvoient JSON.
- En-têtes recommandés pour le frontend :
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` (lorsqu'un endpoint est protégé)

------

Endpoints
=========

1) Auth (/v1/auth)
------------------

POST /v1/auth/login
- Description : authentifie un utilisateur avec username + password et renvoie un JWT user.
- Body (JSON) :
  {
    "username": "admin",
    "password": "admin"
  }
- Response 200 :
  {
    "token": "<jwt-token>",
    "user": {"id": "<userId>", "username": "admin", "name": "Administrator", "role": "admin"}
  }
- Erreurs : 400 si body manquant, 401 si identifiants invalides, 500 si erreur serveur.

POST /v1/auth/register
- Description : crée un nouvel utilisateur. (Attention: dans le controller, le rôle par défaut nouvellement créé est `admin`).
- Body (JSON) :
  {
    "username": "alice",
    "password": "pwd123",
    "name": "Alice"
  }
- Response 201 :
  {
    "message": "User created successfully",
    "user": {"id": "<userId>", "username": "alice", "name": "Alice", "role": "admin"}
  }
- Erreurs : 400 si champs manquants ou username déjà utilisé, 500 si erreur serveur.

GET /v1/auth/challenge?card_id=<card_id>
- Description : génère un challenge (hex) pour une carte enregistrée et active (nécessite que la carte ait une public_key).
- Query params : `card_id` (required)
- Response 200 : { "challenge": "<hexstring>" }
- Erreurs : 400 si card_id absent, 404 si carte introuvable, 403 si carte non active ou pas de public_key.

POST /v1/auth/card
- Description : authentifie une carte via signature du challenge (flow PKI). Renvoie un token carte (type: 'card').
- Body (JSON) :
  {
    "card_id": "<cardId>",
    "signature": "<base64-signature>",
    "challenge": "<challenge-string-returned-earlier>"
  }
- Response 200 :
  {
    "token": "<jwt-card-token>",
    "card_id": "<cardId>",
    "expires_in": 3600
  }
- Erreurs : 400 si paramètres manquants, 401/403 si challenge/signature invalides ou carte inactive.

------

2) Users (/v1/user)
-------------------
Note importante : dans le code actuel les endpoints utilisateurs ne nécessitent pas d'auth dans `userRoutes.js`. Il existe cependant un endpoint `POST /v1/user/login` qui **ne** renvoie pas de JWT (il renvoie l'objet user et la carte s'il y en a).

POST /v1/user/login
- Description : authentification utilisateur (implémentation actuelle effectue `User.findOne({ username, password })` — attention aux mots de passe en clair selon l'implémentation).
- Body : { "username": "alice", "password": "pwd123" }
- Response 200 : { user: { ...userFields }, card: { ...cardFields } } ou 401

GET /v1/user/
- Description : retourne la liste de tous les utilisateurs.
- Query optionnelle : `card_id` — si fourni, retourne l'utilisateur attaché à la carte.
- Response 200 : [ { user }, { user } ]

POST /v1/user/
- Description : crée un nouvel utilisateur (same as auth/register but in different controller).
- Body : { name, username, password }
- Response 201 : user object

GET /v1/user/:id
- Description : récupère un utilisateur par _id
- Response 200 : user object ou 404

POST /v1/user/:id
- Description : met à jour (patch-like) un utilisateur (name,username,password,role possiblement modifiables)
- Body : { name?, username?, password?, role? }
- Response 200 : user object ou 404

DELETE /v1/user/:id
- Description : supprime un utilisateur
- Response 204 (no content) ou 404

------

3) Cards (/v1/card)
-------------------
Tous les /v1/card/* sont protégés par `verifyJWT` (donc requièrent un token utilisateur dans Authorization header).

GET /v1/card/
- Description : retourne toutes les cartes.
- Response 200 : [ { card }, { card } ]
- Exemple card :
  {
    "_id": "<id>",
    "comment": "Welcome card",
    "user_id": { "_id": "<userId>", "name": "Alice" } | null,
    "status": "inactive|active|waiting_activation|blocked",
    "puk": null,
    "public_key": "-----BEGIN PUBLIC KEY-----...",
    "createdAt": "...",
    "updatedAt": "..."
  }

POST /v1/card/
- Description : crée une nouvelle carte
- Body (JSON) : { comment?: string, puk?: string }
- Response 201 : card object

GET /v1/card/:card_id
- Description : retourne une carte par ID
- Response 200 : card object ou 404

PATCH /v1/card/:card_id
- Description : met à jour des champs autorisés : comment, status, puk, public_key. **public_key doit contenir `BEGIN PUBLIC KEY`**
- Body : { comment?, status?, puk?, public_key? }
- Response 200 : updated card ou erreurs 400/404

POST /v1/card/:card_id/assign
- Description : assigne une carte à un utilisateur
- Body : { user_id: "<userId>" }
- Response 200 : updated card

DELETE /v1/card/:card_id/assign
- Description : dés-assigne la carte d'un utilisateur (set user_id à null)
- Response 200 : updated card

DELETE /v1/card/:card_id
- Description : supprime la carte
- Response 204 sur succès

------

4) Transactions (/v1/transactions)
---------------------------------
Middleware : `verifyAny` — accepte token utilisateur OU token carte.

GET /v1/transactions
- Description : retourne des transactions différentes selon le type d'authentification :
  - Si request par carte token => retourne transactions de l'utilisateur associé à la carte.
  - Si user token admin (role === 'admin') et aucun query param `userId` => retourne les 100 dernières transactions (admin view).
  - Si user token admin avec `?userId=<id>` => retourne transactions du userId donné.
  - Si user token non-admin => retourne transactions liées à ce user.
- Query params : optional `userId` (seulement pris en compte par admin)
- Response 200 : [ { _id, operation, source_user_name, destination_user_name, source_card_id, date } ]

POST /v1/transactions
- Description : crée une transaction (doit être authentifié — user token or card token)
- Body (JSON) :
  {
    "destination_user_id": "<userId>",
    "operation": 10
  }
  - `operation` est un nombre (positif) indiquant la somme à transférer.
- Behaviour :
  - Si la requête est envoyée avec un token carte, la transaction source_user_id est déterminée depuis la carte et source_card_id renseigné.
  - Si la requête est envoyée avec un token user, source_user_id est le user du token.
- Response 201 : transaction créé (objet Transaction)
- Erreurs : 400 si champs manquants, 401 si pas d'auth

------

Schémas des ressources (résumé)
-------------------------------
User
- _id, name (string), username (string), password (string), createdAt, updatedAt

Card
- _id, comment (string), user_id (ObjectId ou null), status (string), puk (string|null), public_key (string|null), createdAt, updatedAt

Transaction
- _id, source_user_id (ObjectId), destination_user_id (ObjectId), source_card_id (ObjectId|null), operation (Number), date, createdAt, updatedAt

Challenge
- challenge (string), card_id (string), createdAt (expire après 300s)

------

Exemples rapides côté frontend (fetch)
--------------------------------------
1) Login utilisateur (auth -> token)

```javascript
// auth/login
const res = await fetch('/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin' })
});
const data = await res.json();
// sauvegarder data.token et l'utiliser pour Authorization
```

2) Requête protégée (ex: lister les cartes)

```javascript
const token = localStorage.getItem('token'); // ou gestion state
const res = await fetch('/v1/card/', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const cards = await res.json();
```

3) Flow d'authentification par carte (PKI)
- GET `/v1/auth/challenge?card_id=<id>` -> obtenir "challenge"
- Signer ce challenge côté carte et envoyer POST `/v1/auth/card` : {card_id, signature, challenge}
- Recevoir le token carte et l'utiliser

------

Astuces / Notes / Limitations
-----------------------------
- Attention : il y a deux flows de login différents : `/v1/auth/login` qui renvoie un token JWT (authController) et `/v1/user/login` (userController) qui renvoie l'objet user et card mais PAS de token. Pour une intégration claire côté frontend, préférez `/v1/auth/login` pour obtenir un token.
- Les mots de passe dans `userController.login` utilisent `User.findOne({ username, password })` — suivant l'environnement de production, cela peut nécessiter une harmonisation (y compris hashing) afin d'éviter incohérences.
- Assurez-vous que le backend a `MONGO_URI` et `PORT` et que le service expose CORS (déjà configuré via `app.use(cors())`).
- Stocker les tokens côté frontend de façon sécurisée (HttpOnly cookie recommandé pour production) — actuellement exemples montrent localStorage pour simplicité.

------

Si tu veux, je peux :
- ajouter des exemples cURL pour chaque endpoint,
- générer un fichier de Postman / OpenAPI (swagger) prêt à l'emploi,
- harmoniser le login utilisateur (faire en sorte qu'il renvoie le JWT et que les mots de passe soient toujours hachés).

🎯 Prochaine étape si tu veux : je finalise la documentation en générant des exemples cURL et un fichier OpenAPI/Swagger minimal.
