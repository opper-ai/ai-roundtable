FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/

RUN npm ci

COPY frontend/ frontend/
COPY backend/ backend/

RUN npm run build -w frontend

EXPOSE ${PORT:-3001}

CMD ["npm", "start", "-w", "backend"]
