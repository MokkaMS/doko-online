# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json files for dependency installation
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
# Root dependencies (frontend)
RUN npm ci
# Server dependencies (backend)
RUN cd server && npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Build backend
RUN cd server && npm run build

# Stage 2: Run the application
FROM node:20-alpine

WORKDIR /app

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy built backend code
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package*.json ./server/

# Install production dependencies for the server
RUN cd server && npm ci --omit=dev

# Set the environment variable for the port
ENV PORT=5173

# Expose the application port
EXPOSE 5173

# Start the server
CMD ["node", "server/dist/index.js"]
