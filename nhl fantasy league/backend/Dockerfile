# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy migration runner script
COPY run-migrations.js ./

# Expose port
EXPOSE 3001

# Copy startup script
COPY railway-start.sh ./
RUN chmod +x railway-start.sh

# Start the application (use railway-start.sh to run migrations)
CMD ["sh", "railway-start.sh"]

