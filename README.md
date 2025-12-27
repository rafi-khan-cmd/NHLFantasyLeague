# Supply Chain Digital Twin

A comprehensive supply chain simulation and optimization platform that enables users to build scenarios, run simulations, and compare cost/service impacts.

## 🚀 Quick Links

- [Getting Started](#getting-started)
- [GitHub Hosting Guide](./GITHUB_HOSTING.md)
- [Project Status](./PROJECT_STATUS.md)
- [Architecture](#architecture)

## Architecture

- **Frontend**: Angular (enterprise-style forms + scenario comparison)
- **Backend**: Spring Boot + job queue (async simulation runs)
- **Data**: Snowflake for inventory/orders/suppliers + simulation outputs
- **Compute**: Databricks + PySpark for Monte Carlo simulation + forecasting
- **Streaming**: Kafka for live shipment/production events (optional)
- **Infra**: Docker + Kubernetes; CI/CD GitHub Actions

## Project Structure

```
SupplyProject/
├── frontend/          # Angular application
├── backend/           # Spring Boot application
├── databricks/        # PySpark simulation scripts
├── kafka/             # Kafka configuration and producers
├── docker/            # Docker configurations
├── k8s/               # Kubernetes manifests
└── .github/           # GitHub Actions workflows
```

## Getting Started

### 🆓 Free Edition (Recommended - No Setup!)

The app works in **FREE mock mode** by default - no setup needed!

```bash
# Start infrastructure
docker-compose -f docker/docker-compose.yml up -d

# Start backend (uses free mock mode automatically)
cd backend && ./mvnw spring-boot:run

# Start frontend
cd frontend && npm install && ng serve
```

Open: **http://localhost:4200** - Everything works!

### Quick Setup (With Snowflake/Databricks)

1. **Set up Snowflake database**: Run SQL from `backend/src/main/resources/snowflake-setup.sql` in Snowflake
2. **Configure environment variables**: Copy `.env.example` to `.env` and fill in your credentials
3. **Start backend**: `cd backend && ./mvnw spring-boot:run`

The app automatically sets up Snowflake tables on startup if credentials are provided.

### Prerequisites

- Node.js 18+ and npm
- Java 17+
- Docker and Docker Compose
- Kubernetes cluster (for deployment)
- Snowflake account (see [SETUP_SNOWFLAKE_DATABRICKS.md](SETUP_SNOWFLAKE_DATABRICKS.md))
- Databricks workspace (see [SETUP_SNOWFLAKE_DATABRICKS.md](SETUP_SNOWFLAKE_DATABRICKS.md))

### Local Development

1. **Backend**:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   ng serve
   ```

3. **Kafka** (optional):
   ```bash
   docker-compose -f docker/kafka-compose.yml up
   ```

### Docker Deployment

```bash
docker-compose -f docker/docker-compose.yml up
```

### Kubernetes Deployment

```bash
kubectl apply -f k8s/
```

## Features

- **Scenario Builder**: Create custom supply chain scenarios with supplier delays, demand spikes, etc.
- **Simulation Engine**: Monte Carlo simulations powered by PySpark
- **Forecasting**: Demand and supply forecasting
- **Comparison Dashboard**: Compare multiple scenarios side-by-side
- **Real-time Events**: Live shipment and production event streaming (optional)

## Documentation

- [Getting Started](#getting-started) - Quick start guide
- [GitHub Hosting Guide](GITHUB_HOSTING.md) - How to host on GitHub
- [Project Status](PROJECT_STATUS.md) - Current project status and features
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [Architecture Overview](ARCHITECTURE.md) - System architecture details
- [Contributing Guide](CONTRIBUTING.md) - Development guidelines

## License

MIT

