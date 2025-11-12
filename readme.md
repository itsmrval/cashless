## Cashless system

#### Description
Ce projet universitaire met en place une infrastructure de paiement électronique à base de cartes à puce.
L'objectif est de permettre des recharges, paiements et transferts sécurisés entre utilisateurs, bornes et machines connectées.

## Structure

```
cashless/
├── api/          # Node.js REST API
├── card/         # Smart card firmware (ATmega328p)
├── driver/       # Card reader driver (C)
└── docker-compose.yml
```

## Déploiement

### Environnement de développement

```bash
docker-compose up
```

l'api est disponible sur `http://localhost:3000`

### Configuration Ansible

```bash
cd ansible
cp group_vars/all.yml.example group_vars/all.yml
# Éditer all.yml avec vos paramètres locaux
```

### Créer une carte

```bash
make card CARD_ID=ABCD1234EFGH5678IJKL9012
```

### Build & exécution du driver

```bash
cd driver
make API_BASE_URL=http://localhost:3000/v1
./driver
```

## Endpoints API

### User

- `GET /v1/user` - Liste les utilisateurs
- `POST /v1/user` - Crée un utilisateur `{name: "John"}`
- `GET /v1/user/:id` - Récupère les informations d'un utilisateur
- `GET /v1/user?card_id=<id>` - Récupère un utilisateur à partir de l'id de carte 
- `POST /v1/user/:id` - Met à jour un utilisateur `{name: "Jane"}`
- `DELETE /v1/user/:id` - Supprime un utilisateur

### Card

- `GET /v1/card` - Liste toutes les cartes
- `POST /v1/card` - Crée une nouvelle carte en DB
- `GET /v1/card/:card_id` - Récupère les infos d'une carte
- `PATCH /v1/card/:card_id` - Met à jour `{comment: "...", status: "active"}`
- `POST /v1/card/:card_id/assign` - Assigne une carte à un user `{user_id: "..."}`
- `DELETE /v1/card/:card_id/assign` - Désassigne une carte
- `DELETE /v1/card/:card_id` - Supprime une carte

## Configuration

Modifie `driver/makefile` pour changer l'url de l'API
```makefile
API_BASE_URL=http://localhost:3000/v1
```
