-- Snowflake Database Setup Script
-- Run this in your Snowflake worksheet to set up the required tables

-- Create database (if it doesn't exist)
CREATE DATABASE IF NOT EXISTS SUPPLYCHAIN;

-- Use the database
USE DATABASE SUPPLYCHAIN;

-- Create schema
CREATE SCHEMA IF NOT EXISTS RAW;

-- Use the schema
USE SCHEMA RAW;

-- Note: If you prefer to use PUBLIC schema, change RAW to PUBLIC in the connection string

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
    product_id VARCHAR(50) PRIMARY KEY,
    current_inventory INTEGER NOT NULL,
    reorder_point INTEGER NOT NULL,
    safety_stock INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    order_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id VARCHAR(50) NOT NULL,
    supplier_name VARCHAR(100) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    lead_time_days INTEGER NOT NULL,
    cost_per_unit DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (supplier_id, product_id)
);

-- Create demand_history table
CREATE TABLE IF NOT EXISTS demand_history (
    product_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    demand INTEGER NOT NULL,
    PRIMARY KEY (product_id, date)
);

-- Create simulation_results table (for storing simulation outputs)
CREATE TABLE IF NOT EXISTS simulation_results (
    result_id VARCHAR(50) PRIMARY KEY,
    scenario_id VARCHAR(50) NOT NULL,
    total_cost DECIMAL(15,2) NOT NULL,
    service_level DECIMAL(5,2) NOT NULL,
    inventory_cost DECIMAL(15,2) NOT NULL,
    stockout_cost DECIMAL(15,2) NOT NULL,
    average_inventory_level DECIMAL(10,2),
    stockout_events INTEGER,
    on_time_delivery DECIMAL(5,2),
    total_orders INTEGER,
    fulfilled_orders INTEGER,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Insert sample inventory data
INSERT INTO inventory (product_id, current_inventory, reorder_point, safety_stock) VALUES
    ('PROD-001', 1000, 200, 100),
    ('PROD-002', 500, 150, 75),
    ('PROD-003', 750, 180, 90),
    ('PROD-004', 1200, 250, 125),
    ('PROD-005', 800, 200, 100),
    ('PROD-006', 600, 150, 75),
    ('PROD-007', 900, 220, 110),
    ('PROD-008', 1100, 240, 120),
    ('PROD-009', 700, 170, 85),
    ('PROD-010', 950, 210, 105);

-- Insert sample supplier data
INSERT INTO suppliers (supplier_id, supplier_name, product_id, lead_time_days, cost_per_unit) VALUES
    ('SUPPLIER-001', 'Acme Corp', 'PROD-001', 7, 10.50),
    ('SUPPLIER-002', 'Global Supplies', 'PROD-002', 5, 8.75),
    ('SUPPLIER-003', 'Best Products', 'PROD-003', 6, 12.00),
    ('SUPPLIER-001', 'Acme Corp', 'PROD-004', 7, 15.25),
    ('SUPPLIER-004', 'Quality Goods', 'PROD-005', 4, 9.50),
    ('SUPPLIER-002', 'Global Supplies', 'PROD-006', 5, 11.00),
    ('SUPPLIER-005', 'Fast Delivery Inc', 'PROD-007', 3, 13.75),
    ('SUPPLIER-003', 'Best Products', 'PROD-008', 6, 14.50),
    ('SUPPLIER-004', 'Quality Goods', 'PROD-009', 4, 10.25),
    ('SUPPLIER-005', 'Fast Delivery Inc', 'PROD-010', 3, 16.00);

-- Insert sample demand history (last 90 days)
INSERT INTO demand_history (product_id, date, demand)
SELECT 
    'PROD-' || LPAD(seq4() % 10 + 1, 3, '0') as product_id,
    DATEADD(day, -seq4(), CURRENT_DATE()) as date,
    100 + UNIFORM(0, 200, RANDOM()) as demand
FROM TABLE(GENERATOR(ROWCOUNT => 900));

-- Verify data
SELECT COUNT(*) as inventory_count FROM inventory;
SELECT COUNT(*) as supplier_count FROM suppliers;
SELECT COUNT(*) as demand_count FROM demand_history;

