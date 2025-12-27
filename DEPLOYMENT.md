# Deployment Guide

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (for production)
- Snowflake account and credentials
- Databricks workspace and access token
- PostgreSQL database (or use Docker)
- RabbitMQ (or use Docker)
- Kafka (optional, for streaming)

## Local Development

### 1. Start Infrastructure Services

```bash
# Start PostgreSQL, RabbitMQ, and Kafka
docker-compose -f docker/docker-compose.yml up -d
```

### 2. Configure Environment Variables

Create `.env` files or set environment variables:

**Backend (.env or environment variables):**
```bash
DB_USERNAME=postgres
DB_PASSWORD=postgres
SNOWFLAKE_URL=your-snowflake-url
SNOWFLAKE_USERNAME=your-username
SNOWFLAKE_PASSWORD=your-password
DATABRICKS_WORKSPACE_URL=https://your-workspace.cloud.databricks.com
DATABRICKS_ACCESS_TOKEN=your-token
```

### 3. Run Backend

```bash
cd backend
./mvnw spring-boot:run
```

### 4. Run Frontend

```bash
cd frontend
npm install
ng serve
```

Access the application at `http://localhost:4200`

## Docker Deployment

### Build and Run

```bash
# Build and start all services
docker-compose -f docker/docker-compose.yml up --build
```

### Access Services

- Frontend: http://localhost:4200
- Backend API: http://localhost:8080
- RabbitMQ Management: http://localhost:15672
- Kafka UI: http://localhost:8081

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Create Secrets

```bash
# PostgreSQL
kubectl create secret generic postgres-secret \
  --from-literal=password=your-password \
  -n supplychain-digital-twin

# Snowflake
kubectl create secret generic snowflake-secret \
  --from-literal=url=your-url \
  --from-literal=username=your-username \
  --from-literal=password=your-password \
  -n supplychain-digital-twin

# Databricks
kubectl create secret generic databricks-secret \
  --from-literal=workspace-url=your-url \
  --from-literal=access-token=your-token \
  -n supplychain-digital-twin
```

### 3. Deploy Services

```bash
# Deploy in order
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/rabbitmq-deployment.yaml
kubectl apply -f k8s/kafka-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

### 4. Verify Deployment

```bash
kubectl get all -n supplychain-digital-twin
```

## Databricks Setup

### 1. Upload Simulation Scripts

```bash
# Using Databricks CLI
databricks fs cp -r databricks/simulations dbfs:/simulations
```

### 2. Create Job

Create a Databricks job that runs `monte_carlo_simulation.py` with parameters.

### 3. Configure API Access

Ensure your Databricks access token has permissions to:
- Submit jobs
- Read job status
- Access cluster

## CI/CD Setup

### GitHub Secrets

Configure the following secrets in GitHub:

- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password
- `DATABRICKS_HOST`: Databricks workspace URL
- `DATABRICKS_TOKEN`: Databricks access token

### Workflows

The CI/CD pipeline will:
1. Build and test on every push
2. Build Docker images on main branch
3. Deploy to Kubernetes (if configured)
4. Upload Databricks scripts

## Monitoring

### Health Checks

- Backend: http://localhost:8080/actuator/health
- Frontend: http://localhost:4200

### Logs

```bash
# Docker
docker-compose logs -f

# Kubernetes
kubectl logs -f deployment/backend -n supplychain-digital-twin
kubectl logs -f deployment/frontend -n supplychain-digital-twin
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check connection string in application.yml
- Ensure network connectivity

### Databricks Connection Issues

- Verify access token is valid
- Check workspace URL format
- Ensure cluster is running

### Kafka Connection Issues

- Verify Zookeeper is running
- Check Kafka broker address
- Ensure topics are created

