"""
Kafka Producer for Production Events
Publishes real-time production events to Kafka
"""

import json
import time
from kafka import KafkaProducer
from datetime import datetime
import random

class ProductionEventProducer:
    def __init__(self, bootstrap_servers='localhost:9092'):
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None
        )
        self.topic = 'production-events'
    
    def produce_production_event(self, production_id, product_id, quantity, status, facility_id):
        """Produce a production event"""
        event = {
            'production_id': production_id,
            'product_id': product_id,
            'quantity': quantity,
            'status': status,
            'facility_id': facility_id,
            'timestamp': datetime.now().isoformat()
        }
        
        self.producer.send(
            self.topic,
            key=production_id,
            value=event
        )
        self.producer.flush()
    
    def produce_random_events(self, count=10):
        """Produce random production events for testing"""
        for i in range(count):
            production_id = f"PROD-{i+1:04d}"
            product_id = f"PROD-{random.randint(1, 10)}"
            quantity = random.randint(50, 500)
            status = random.choice(['IN_PROGRESS', 'COMPLETED', 'QUALITY_CHECK'])
            facility_id = f"FACILITY-{random.randint(1, 3)}"
            
            self.produce_production_event(
                production_id,
                product_id,
                quantity,
                status,
                facility_id
            )
            
            time.sleep(1)
    
    def close(self):
        self.producer.close()

if __name__ == "__main__":
    producer = ProductionEventProducer()
    try:
        producer.produce_random_events(10)
    finally:
        producer.close()

