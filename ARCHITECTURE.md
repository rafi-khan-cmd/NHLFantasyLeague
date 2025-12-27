# Architecture Overview

## System Architecture

The Supply Chain Digital Twin is a microservices-based application with the following components:

### Frontend (Angular)
- **Location**: `frontend/`
- **Purpose**: User interface for scenario building and comparison
- **Key Features**:
  - Scenario builder with dynamic forms
  - Scenario comparison dashboard
  - Real-time simulation status updates
  - Material Design UI components

### Backend (Spring Boot)
- **Location**: `backend/`
- **Purpose**: REST API and business logic
- **Key Features**:
  - Scenario management
  - Simulation job orchestration
  - Async job processing with RabbitMQ
  - Integration with Databricks and Snowflake

### Data Layer
- **PostgreSQL**: Primary database for scenarios and simulation results
- **Snowflake**: Data warehouse for inventory, orders, suppliers, and simulation outputs
- **RabbitMQ**: Message queue for async simulation jobs

### Compute Layer
- **Databricks + PySpark**: 
  - Monte Carlo simulations
  - Demand and supply forecasting
  - Time series analysis

### Streaming (Optional)
- **Kafka**: Real-time event streaming for:
  - Shipment events
  - Production events
  - Live supply chain monitoring

## Data Flow

1. **Scenario Creation**: User creates scenario via Angular frontend → Spring Boot API → PostgreSQL
2. **Simulation Trigger**: User triggers simulation → Spring Boot creates job → RabbitMQ queue → Databricks job submission
3. **Simulation Execution**: Databricks runs PySpark simulation → Reads from Snowflake → Writes results to Snowflake
4. **Result Retrieval**: Spring Boot polls Databricks → Retrieves results → Stores in PostgreSQL → Returns to frontend
5. **Comparison**: Frontend requests comparison → Spring Boot queries results → Returns aggregated comparison data

## Technology Stack

### Frontend
- Angular 17
- Angular Material
- RxJS
- TypeScript

### Backend
- Spring Boot 3.2
- Spring Data JPA
- Spring AMQP (RabbitMQ)
- Spring Kafka
- PostgreSQL
- Snowflake JDBC

### Data & Analytics
- Databricks
- PySpark
- Snowflake
- PostgreSQL

### Infrastructure
- Docker
- Kubernetes
- GitHub Actions (CI/CD)
- RabbitMQ
- Kafka

## Deployment Architecture

### Development
- Docker Compose for local services
- Direct connections to cloud services (Snowflake, Databricks)

### Production
- Kubernetes cluster
- Containerized services
- External managed services (Snowflake, Databricks)
- Load balancers
- Auto-scaling

## Security Considerations

- Secrets management via Kubernetes secrets
- Environment-based configuration
- CORS configuration for frontend-backend communication
- API authentication (to be implemented)
- Database connection encryption

## Scalability

- Horizontal scaling via Kubernetes
- Async job processing prevents blocking
- Stateless backend services
- Database connection pooling
- Caching strategies (to be implemented)

## Monitoring & Observability

- Spring Boot Actuator for health checks
- Application logging
- Kubernetes metrics
- Databricks job monitoring
- (Future: Prometheus, Grafana integration)

