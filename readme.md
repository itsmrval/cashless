## Cashless system

#### Description
This university project is setting up an electronic payment infrastructure based on smart cards.
The aim is to enable secure top-ups, payments, and transfers between users, terminals, and connected machines.

Dashboard             |  Example web client
:-:|:--:
![](https://i.imgur.com/Nw2YLg3.png)  | ![](https://i.imgur.com/L67j3f3.png)

#### Quick Links
- [Structure](#structure)
- [Docker Deployment](#docker-deployment)
- [Deployment](#deployment)
  - [Create a card](#create-a-card)
  - [Socket Reader](#socket-reader)
  - [Build clients](#build-and-run-clients)
- [API Endpoints](#api-endpoints)
- [Smart Card Protocol](#smart-card-protocol-apdu)

## Structure

```
cashless/
├── api/             # Main API that handle transactions and user accounts
├── website/         # Frontend dashboard website
├── card_software/   # Firmware that is flashed on cards
├── assignator/      # Simple tool that register the card in main API & assign ID
├── socket_reader/   # WebSocket service for real-time card detection
├── clients/
├   ├── atm/         # ATM client that allow to setup a PIN code, see transactions
├   └── coffeeshop/  # Coffe shop client example that allow payments
└── docker-compose.yml
```

## Running software

Use pre-built Docker images for API, website, clients or socket_reader for example:

**Socket reader:**
```bash
docker run -d \
  --name cashless-socket-reader \
  -p 8001:8001 \
  -e API_BASE_URL="https://api.cashless.rvcs.fr/v1" \
  -e DEST_USERNAME="merchant_user" \
  -e DEST_PASSWORD="merchant_pass" \
  --privileged \
  ghcr.io/itsmrval/cashless/socket-reader:main
```

**ATM:**
```bash
wget https://raw.githubusercontent.com/itsmrval/cashless/main/clients/atm/atm.conf.example -O atm.conf

docker run -it \
  --name cashless-atm \
  -v $(pwd)/atm.conf:/app/atm.conf \
  --privileged \
  ghcr.io/itsmrval/cashless/atm:main
```

## Deployment

### Ansible configuration

```bash
cd ansible
cp group_vars/all.yml.example group_vars/all.yml
```
Edit group vars to allow API calls

### Create a card

**1. Flash card firmware:**
```bash
cd ansible
ansible-playbook flash_card.yml
```
Plug a card into the arduino writter, then run the playbook.

**2. Assign (register the card into the API):**
```bash
cd ansible
ansible-playbook assign_card.yml
```
Plug a flashed card into the reader, then run the playbook.

**APDU commands used by assignator:**
- `READ_CARD_ID (0x01)` - Verify card is unassigned (returns all zeros)
- `READ_VERSION (0x02)` - Check firmware version
- `ASSIGN_CARD (0x08)` - Write card ID and PUK to card (one-time operation)
- `WRITE_PRIVATE_KEY_CHUNK (0x0A)` - Write signing key for challenge-response authentication

### Socket reader

WebSocket service that broadcasts real-time card insertion/removal events to connected clients.

**Start the service:**
```bash
cd ansible
ansible-playbook start_socket.yml
```

**Stop the service:**
```bash
ansible-playbook stop_socket.yml
```

The service runs on `https://0.0.0.0:8001` and supports:
- Real-time card detection events (`card_inserted`, `card_removed`)
- PIN verification via WebSocket (`verify_pin` event)
- Transaction creation via WebSocket (`create_transaction` event)
- Challenge signing and cryptographic authentication
- SSL/TLS encrypted communication

**APDU commands used by socket reader:**
- `READ_CARD_ID (0x01)` - Detect and read card ID
- `READ_VERSION (0x02)` - Check card firmware version
- `IS_PIN_DEFINED (0x0E)` - Verify if card is activated
- `VERIFY_PIN (0x06)` - Authenticate user locally on card
- `SET_CHALLENGE (0x0C)` + `SIGN_CHALLENGE (0x0B)` - Challenge-response authentication with API

See [socket_reader/README.md](socket_reader/README.md) for WebSocket API documentation.

### Build and run clients

```bash
cd clients/atm
make
./atm atm.conf
```
Example for the ATM client.

**APDU commands used by ATM client:**
- `READ_CARD_ID (0x01)` - Detect and read card ID
- `READ_VERSION (0x02)` - Check card firmware version
- `WRITE_PIN_ONLY (0x09)` - Setup PIN during activation
- `WRITE_PIN (0x03)` - Setup PIN and PUK during initial configuration
- `VERIFY_PIN (0x06)` - Authenticate user locally on card
- `VERIFY_PUK (0x07)` - Unblock card with PUK and set new PIN
- `GET_REMAINING_ATTEMPTS (0x0D)` - Check remaining PIN/PUK attempts
- `SET_CHALLENGE (0x0C)` + `SIGN_CHALLENGE (0x0B)` - Challenge-response authentication with API

The ATM client provides a complete card management interface including PIN setup, PUK-based unlock, and transaction viewing.

## API endpoints

### Authentication

- `POST /v1/auth/login` - Authenticate a user `{username, password}` → `200` + JWT token (valid 24h)
- `POST /v1/auth/register` - Register a new user `{username, password, name}` → `201`
- `GET /v1/auth/challenge?card_id=<id>` - Generate cryptographic challenge for card authentication → `200`
- `POST /v1/auth/card` - Authenticate a card by signature `{card_id, signature}` → `200` + JWT token (valid 1h)

### User

- `GET /v1/user` - List all users (admin only, JWT required) → `200`
- `GET /v1/user?card_id=<id>` - Get user by card ID (JWT required) → `200`
- `POST /v1/user` - Create a user `{name}` (admin only, JWT required) → `201`
- `GET /v1/user/:id` - Get user information (admin or own profile, JWT required) → `200`
- `PATCH /v1/user/:id` - Update a user `{name, ...}` (admin or own profile, JWT required) → `200`
- `DELETE /v1/user/:id` - Delete a user (admin only, JWT required) → `200`
- `GET /v1/user/:id/balance` - Calculate user balance from transactions (admin or own profile, JWT required) → `200`

### Card

- `GET /v1/card` - List all cards with user info (JWT required) → `200`
- `POST /v1/card` - Create a new card `{comment, puk}` (optional, JWT required) → `201`
- `GET /v1/card/:card_id` - Get card info with associated user (JWT required) → `200`
- `PATCH /v1/card/:card_id` - Update `{comment, status: "active|inactive|waiting_activation", puk, public_key}` (JWT required) → `200`
- `POST /v1/card/:card_id/assign` - Assign a card to user `{user_id}` (JWT required) → `200`
- `DELETE /v1/card/:card_id/assign` - Unassign a card from its user (JWT required) → `200`
- `DELETE /v1/card/:card_id` - Delete a card (JWT required) → `200`

### Transactions

- `GET /v1/transactions` - List transactions (JWT or card auth). Admin sees all, user sees only their own. Query `?userId=<id>` for admin → `200` (limited to 50 for user, 100 for admin)
- `POST /v1/transactions` - Create a transaction `{destination_user_id, operation}` where `operation` is the amount. Card auth uses card's user, JWT can specify source if admin → `201`
- `PATCH /v1/transactions/:transactionId/comment` - Update transaction comment `{comment}` (admin or source/destination user, JWT required) → `200`

### Beneficiaries

- `GET /v1/user/:id/beneficiaries` - List user's beneficiaries (admin or own profile, JWT required) → `200`
- `POST /v1/user/:id/beneficiaries` - Add a beneficiary `{beneficiary_id, comment}` (optional, admin or own profile, JWT required) → `201`
- `PATCH /v1/user/:id/beneficiaries/:userId` - Update beneficiary comment `{comment}` (admin or own profile, JWT required) → `200`
- `DELETE /v1/user/:id/beneficiaries/:userId` - Remove a beneficiary (admin or own profile, JWT required) → `200`

## Smart Card Protocol (APDU)

### Supported commands (CLA=0x80)

The card communicates via PC/SC protocol with APDU commands:

| INS | Command | Data Size | Description |
|-----|---------|-----------|-------------|
| `0x01` | READ_CARD_ID | 24 bytes out | Read unique card ID from EEPROM |
| `0x02` | READ_VERSION | 1 byte out | Read firmware version |
| `0x03` | WRITE_PIN | 8 bytes in | Write PIN (4 bytes) + PUK (4 bytes) |
| `0x06` | VERIFY_PIN | 4 bytes in | Verify PIN, returns remaining attempts |
| `0x07` | VERIFY_PUK | 8 bytes in | Verify PUK (4 bytes) + set new PIN (4 bytes) |
| `0x08` | ASSIGN_CARD | 28 bytes in | Assign card ID (24 bytes) + PUK (4 bytes) - one-time operation |
| `0x09` | WRITE_PIN_ONLY | 4 bytes in | Write PIN only (4 bytes) |
| `0x0A` | WRITE_PRIVATE_KEY_CHUNK | 1-65 bytes in | Write private key chunk (index byte + up to 64 bytes data) |
| `0x0B` | SIGN_CHALLENGE | 4 bytes out | Sign challenge using XOR with stored key (requires PIN verification) |
| `0x0C` | SET_CHALLENGE | 4 bytes in | Set 4-byte challenge for signing (requires PIN verification) |
| `0x0D` | GET_REMAINING_ATTEMPTS | 2 bytes out | Query remaining PIN/PUK attempts without consuming them |
| `0x0E` | IS_PIN_DEFINED | 1 byte out | Check if PIN is defined (0x00=not defined, 0x01=defined) |

### Status codes (SW1/SW2)

| SW1 | SW2 | Meaning |
|-----|-----|---------|
| `0x90` | `0x00` | Success |
| `0x6C` | `XX` | Wrong length, XX = expected size |
| `0x6A` | `0x81` | Card already assigned |
| `0x6A` | `0x82` | Memory offset error (private key write) |
| `0x6A` | `0x84` | Invalid chunk index (must be ≤30) |
| `0x6A` | `0x88` | Key size mismatch during signature |
| `0x69` | `0x82` | Security status not satisfied (PIN verification required) |
| `0x69` | `0x83` | PIN attempts exhausted (locked) |
| `0x69` | `0x84` | PUK attempts exhausted (locked) |
| `0x63` | `0xCn` | Authentication failed, n attempts remaining (n=0-3) |
| `0x6D` | `0x00` | Invalid INS code |
| `0x6E` | `0x00` | Invalid CLA code |

### EEPROM memory layout

| Address | Size | Content |
|---------|------|---------|
| `0x00-0x03` | 4 bytes | PIN |
| `0x04-0x1B` | 24 bytes | Card ID (unique identifier) |
| `0x1C` | 1 byte | Assigned flag (0xFF = unassigned) |
| `0x1D` | 1 byte | PIN attempts remaining (max 3) |
| `0x1E` | 1 byte | PUK attempts remaining (max 3) |
| `0x1F-0x22` | 4 bytes | PUK (PIN Unblock Key) |
| `0x23-0x24` | 2 bytes | Private key size (16-bit big-endian) |
| `0x25+` | up to 1984 bytes | Private key data (31 chunks × 64 bytes max) |

### ATR

```
3B F9 01 05 05 00 00 63 61 73 68 6C 65 73 73
```

Format breakdown:
- `3B` - Initial byte (TS, direct convention)
- `F9` - Format byte (indicates TA1, TB1, TC1, TD1 present + 8 data bytes)
- `01 05 05 00 00` - Interface bytes (TA1, TB1, TC1, TD1)
- `63 61 73 68 6C 65 73 73` - Historical bytes: "cashless" in ASCII

Card identifies itself with the string "cashless".

### Card states

| State | Description | Client Action |
|------|-------------|---------------|
| `waiting_activation` | Card created, PIN not configured | Prompt for PIN setup → activation |
| `active` | Card activated with PIN | Request PIN → authentication |
| `inactive` | Card deactivated | Display error, deny access |

**PIN/PUK security:**
- Both PIN and PUK have 3 attempts before lockout
- Failed attempts return `0x63 0xCn` where n = remaining attempts
- When attempts reach 0: PIN returns `0x69 0x83`, PUK returns `0x69 0x84`
- PUK can reset PIN when verified correctly
- Successful verification resets attempt counter to 3
- Successful PIN or PUK verification sets authenticated state (stored in RAM)
- Commands `SET_CHALLENGE` and `SIGN_CHALLENGE` require prior PIN/PUK verification
- Authenticated state persists until card power cycle (removal from reader)
- Attempting protected commands without verification returns `0x69 0x82`
