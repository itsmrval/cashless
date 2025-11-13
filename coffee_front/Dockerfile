FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers
COPY . .

# Build de l'application
RUN npm run build

# Installer serve pour servir l'application en production
RUN npm install -g serve

# Exposer le port
EXPOSE 3001

# Démarrer l'application
CMD ["serve", "-s", "build", "-l", "3001"]
