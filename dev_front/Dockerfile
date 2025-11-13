
FROM node:18-alpine AS builder
WORKDIR /app
COPY react/package.json ./react/
WORKDIR /app/react
RUN npm install
COPY react ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/react/dist /usr/share/nginx/html
EXPOSE 80
