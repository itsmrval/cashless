## Cashless system

#### Description
Ce projet universitaire met en place une infrastructure de paiement électronique à base de cartes à puce.
L’objectif est de permettre des recharges, paiements et transferts sécurisés entre utilisateurs, bornes et machines connectées.

Le système repose sur deux APIs principales, plusieurs frontends, et un mécanisme de ledger interne assurant l’intégrité et la traçabilité des transactions sans dépendance à une blockchain externe.

#### Fonctionnement général
1. auth_api gère les utilisateurs, les rôles et l’accès (JWT).
2. transactional_api enregistre les transactions et met à jour les soldes.
3. Chaque transaction est ajoutée au ledger interne :
    - Chaque entrée contient un hash du bloc précédent.
    - Ce chaînage garantit qu’aucune transaction passée ne peut être modifiée.
4. Les frontends (driver_frontend, web_frontend) interagissent avec les APIs selon leurs rôles respectifs.

#### Technologies
- FastAPI
- MongoDB / Motor
- Hashlib
- pyscard