# Kafka Event Streaming

This directory contains Kafka producers and consumers for real-time supply chain event streaming.

## Topics

- `shipment-events`: Real-time shipment tracking events
- `production-events`: Real-time production monitoring events

## Setup

1. Start Kafka using Docker Compose:
   ```bash
   docker-compose -f docker/kafka-compose.yml up
   ```

2. Install Python dependencies:
   ```bash
   pip install kafka-python
   ```

## Usage

### Producers

**Shipment Producer:**
```bash
python kafka/producers/shipment-producer.py
```

**Production Producer:**
```bash
python kafka/producers/production-producer.py
```

### Consumer

```bash
python kafka/consumers/event-consumer.py
```

## Integration

Events can be consumed by:
- Spring Boot backend for real-time updates
- Databricks for streaming analytics
- Snowflake for data warehousing

