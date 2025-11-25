# Socket Reader - Configuration

## Configuration requise

Créez un fichier `.env` à partir de `.env.exemple` :

```bash
cp .env.exemple .env
```

Puis modifiez les valeurs selon votre configuration :

```env
API_BASE_URL = https://api.cashless.iut.valentinp.fr/v1
```

### Variables d'environnement

- `API_BASE_URL` : L'URL de base de l'API cashless

## Fonctionnement

Le système utilise l'authentification cryptographique par signature :

1. **Vérification du PIN** : Le PIN est vérifié localement sur la carte physique
2. **Récupération du challenge** : Un challenge est demandé à l'API pour le card_id
3. **Signature du challenge** : La carte signe cryptographiquement le challenge avec sa clé privée
4. **Authentification** : La signature est envoyée à l'API qui vérifie avec la clé publique
5. **Récupération des données** : Une fois authentifiée, la carte peut récupérer les infos utilisateur (prénom, balance) et créer des transactions

Ce système garantit que seule la carte physique peut s'authentifier, car elle seule possède la clé privée nécessaire pour signer le challenge.
