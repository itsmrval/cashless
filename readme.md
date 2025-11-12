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

Services disponibles:
- API: `http://localhost:3000`
- Frontend dev: `http://localhost:3001`

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
- `PATCH /v1/card/:card_id` - Met à jour `{comment: "...", status: "active|inactive|waiting_activation"}`
- `POST /v1/card/:card_id/assign` - Assigne une carte à un user `{user_id: "..."}`
- `DELETE /v1/card/:card_id/assign` - Désassigne une carte
- `POST /v1/card/:card_id/setup-pin` - Configure le PIN lors de l'activation `{pin: "1234"}`
- `POST /v1/card/:card_id/verify-pin` - Vérifie le PIN `{pin: "1234"}`
- `DELETE /v1/card/:card_id` - Supprime une carte

## Protocole carte à puce (APDU)

### Commandes supportées (CLA=0x80)

La carte communique via le protocole PC/SC avec des commandes APDU:

| INS | Commande | P3 (Longueur) | Description | Réponse |
|-----|----------|---------------|-------------|---------|
| `0x01` | READ_CARD_ID | 24 bytes | Lit l'identifiant unique de la carte | 24 bytes + SW1/SW2 |
| `0x02` | READ_VERSION | 1 byte | Lit la version du firmware | 1 byte + SW1/SW2 |
| `0x03` | WRITE_PIN | 4 bytes | Écrit le PIN dans l'EEPROM | SW1/SW2 |
| `0x04` | READ_PIN | 4 bytes | Lit le PIN depuis l'EEPROM | 4 bytes + SW1/SW2 |

**Status Words:**
- `0x90 0x00` - Succès
- `0x6c XX` - Erreur de longueur, XX = longueur attendue
- `0x6d 0x00` - Instruction non supportée
- `0x6e 0x00` - Classe non supportée

### Stockage EEPROM

| Adresse | Taille | Contenu |
|---------|--------|---------|
| `0x00-0x03` | 4 bytes | PIN (4 chiffres en format numérique 0-9) |

### ATR (Answer-To-Reset)

```
3B F0+[SIZE_ATR+1] 01 05 05 00 00 [ATR_STRING]
```

L'ATR identifie la carte avec la chaîne "cashless".

## Flux d'authentification carte

### 1. Nouvelle carte (waiting_activation)

```
┌─────────────┐
│ Carte       │
│ insérée     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Lecture card_id     │◄── APDU 0x80 0x01 (READ_CARD_ID)
│ Lecture version     │◄── APDU 0x80 0x02 (READ_VERSION)
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ GET /card/:card_id  │
│ Vérification status │
└──────┬──────────────┘
       │
       │ status="waiting_activation"
       ▼
┌─────────────────────┐
│ Demande PIN (4)     │
│ Validation format   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Écriture PIN        │◄── APDU 0x80 0x03 (WRITE_PIN)
│ dans EEPROM         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ POST setup-pin      │
│ Hash bcrypt + DB    │
│ status→"active"     │
└─────────────────────┘
```

### 2. Carte active (active)

```
┌─────────────┐
│ Carte       │
│ insérée     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Lecture card_id     │◄── APDU 0x80 0x01 (READ_CARD_ID)
│ Lecture version     │◄── APDU 0x80 0x02 (READ_VERSION)
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ GET /card/:card_id  │
│ Vérification status │
└──────┬──────────────┘
       │
       │ status="active"
       ▼
┌─────────────────────┐
│ Demande PIN         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Lecture PIN EEPROM  │◄── APDU 0x80 0x04 (READ_PIN)
│ Comparaison locale  │
└──────┬──────────────┘
       │
       │ PIN match
       ▼
┌─────────────────────┐
│ POST verify-pin     │
│ Vérification hash   │
└──────┬──────────────┘
       │
       │ PIN valide
       ▼
┌─────────────────────┐
│ Authentification OK │
│ Affiche user.name   │
└─────────────────────┘
```

### 3. Carte inactive (inactive)

```
┌─────────────┐
│ Carte       │
│ insérée     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Lecture card_id     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ GET /card/:card_id  │
│ status="inactive"   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Erreur affichée:    │
│ "Card is not yet    │
│  active"            │
└─────────────────────┘
```

### États de la carte

| État | Description | Action driver |
|------|-------------|---------------|
| `waiting_activation` | Carte créée, PIN non configuré | Demande création PIN → activation |
| `active` | Carte activée avec PIN | Demande PIN → authentification |
| `inactive` | Carte désactivée | Affiche erreur, refuse accès |

### Sécurité PIN

- **Stockage dual**: PIN en clair dans EEPROM (local) + hash bcrypt dans MongoDB (serveur)
- **Validation double**:
  1. Comparaison locale EEPROM vs saisie utilisateur
  2. Vérification hash serveur via API
- **Format**: Exactement 4 chiffres numériques (0-9)
- **Échec**: Rejet immédiat, pas de limite de tentatives dans le driver

## Configuration

Modifie `driver/makefile` pour changer l'url de l'API
```makefile
API_BASE_URL=http://localhost:3000/v1
```
