# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json files for dependency installation
COPY package*.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# Install dependencies (workspaces aware)
RUN npm ci

# Copy source code
COPY . .

# Build shared and frontend (root build script does shared then frontend)
RUN npm run build

# Build backend
RUN npm run build -w doppelkopf-server

# Stage 2: Run the application
FROM node:20-alpine

WORKDIR /app

# Copy package.json files for production install
COPY package*.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# Install production dependencies (including shared workspace link)
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared/dist ./shared/dist

# Set the environment variable for the port
ENV PORT=5173

# Expose the application port
EXPOSE 5173

# Start the server
CMD ["node", "server/dist/index.js"]
