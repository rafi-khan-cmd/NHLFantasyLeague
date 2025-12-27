"""
Kafka Consumer for Supply Chain Events
Consumes shipment and production events and processes them
"""

import json
from kafka import KafkaConsumer
from datetime import datetime

class SupplyChainEventConsumer:
    def __init__(self, bootstrap_servers='localhost:9092', group_id='supplychain-consumer'):
        self.consumer = KafkaConsumer(
            'shipment-events',
            'production-events',
            bootstrap_servers=bootstrap_servers,
            group_id=group_id,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest',
            enable_auto_commit=True
        )
    
    def consume_events(self):
        """Consume and process events"""
        print("Starting to consume events...")
        try:
            for message in self.consumer:
                topic = message.topic
                event = message.value
                
                print(f"Received event from {topic}: {event}")
                
                # Process event based on topic
                if topic == 'shipment-events':
                    self.process_shipment_event(event)
                elif topic == 'production-events':
                    self.process_production_event(event)
                
        except KeyboardInterrupt:
            print("Stopping consumer...")
        finally:
            self.consumer.close()
    
    def process_shipment_event(self, event):
        """Process shipment event"""
        print(f"Processing shipment: {event['shipment_id']} - Status: {event['status']}")
        # In production, update database, trigger alerts, etc.
    
    def process_production_event(self, event):
        """Process production event"""
        print(f"Processing production: {event['production_id']} - Status: {event['status']}")
        # In production, update inventory, trigger workflows, etc.

if __name__ == "__main__":
    consumer = SupplyChainEventConsumer()
    consumer.consume_events()

