"""
Kafka Producer for Shipment Events
Publishes real-time shipment events to Kafka for supply chain monitoring
"""

import json
import time
from kafka import KafkaProducer
from datetime import datetime
import random

class ShipmentEventProducer:
    def __init__(self, bootstrap_servers='localhost:9092'):
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None
        )
        self.topic = 'shipment-events'
    
    def produce_shipment_event(self, shipment_id, supplier_id, product_id, quantity, status):
        """Produce a shipment event"""
        event = {
            'shipment_id': shipment_id,
            'supplier_id': supplier_id,
            'product_id': product_id,
            'quantity': quantity,
            'status': status,
            'timestamp': datetime.now().isoformat()
        }
        
        self.producer.send(
            self.topic,
            key=shipment_id,
            value=event
        )
        self.producer.flush()
    
    def produce_random_events(self, count=10):
        """Produce random shipment events for testing"""
        for i in range(count):
            shipment_id = f"SHIP-{i+1:04d}"
            supplier_id = f"SUPPLIER-{random.randint(1, 5)}"
            product_id = f"PROD-{random.randint(1, 10)}"
            quantity = random.randint(100, 1000)
            status = random.choice(['IN_TRANSIT', 'DELIVERED', 'DELAYED'])
            
            self.produce_shipment_event(
                shipment_id,
                supplier_id,
                product_id,
                quantity,
                status
            )
            
            time.sleep(1)  # Simulate real-time events
    
    def close(self):
        self.producer.close()

if __name__ == "__main__":
    producer = ShipmentEventProducer()
    try:
        producer.produce_random_events(10)
    finally:
        producer.close()

