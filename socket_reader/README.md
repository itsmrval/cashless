# Socket Reader - Configuration

## Configuration requise

Créez un fichier `.env` à partir de `.env.exemple` :

```bash
cp .env.exemple .env
```

Puis modifiez les valeurs selon votre configuration :

```env
API_BASE_URL = https://api.cashless.iut.valentinp.fr/v1
DRIVER_USERNAME = admin
DRIVER_PASSWORD = votre_mot_de_passe
```

### Variables d'environnement

- `API_BASE_URL` : L'URL de base de l'API cashless
- `DRIVER_USERNAME` : Le nom d'utilisateur admin/driver pour accéder aux données utilisateurs
- `DRIVER_PASSWORD` : Le mot de passe du compte admin/driver

## Fonctionnement

Le système utilise un compte admin/driver pour :
1. Récupérer les informations utilisateur (prénom) à partir du card_id
2. Récupérer le solde de l'utilisateur
3. Créer des transactions de paiement

La vérification du PIN est effectuée localement sur la carte physique, pas via l'API.
