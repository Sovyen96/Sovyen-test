# Imagen única: compila el cliente y arranca el servidor que lo sirve.
FROM node:20-slim

WORKDIR /app

# Instala dependencias (capa cacheable).
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm install \
  && npm --prefix server install \
  && npm --prefix client install

# Copia el código y compila el cliente.
COPY . .
RUN npm --prefix client run build

ENV NODE_ENV=production
# La plataforma suele inyectar PORT; 3001 por defecto.
EXPOSE 3001

CMD ["node", "server/index.js"]
