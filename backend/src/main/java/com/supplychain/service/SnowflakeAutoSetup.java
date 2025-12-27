package com.supplychain.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.sql.*;

/**
 * Automatically sets up Snowflake tables and data when application starts
 */
@Component
public class SnowflakeAutoSetup implements CommandLineRunner {
    
    @Autowired
    private SnowflakeService snowflakeService;
    
    @Value("${snowflake.url:}")
    private String snowflakeUrl;
    
    @Value("${snowflake.username:}")
    private String username;
    
    @Value("${snowflake.password:}")
    private String password;
    
    @Value("${snowflake.database:SUPPLYCHAIN}")
    private String database;
    
    @Value("${snowflake.schema:RAW}")
    private String schema;
    
    @Override
    public void run(String... args) throws Exception {
        if (snowflakeUrl == null || snowflakeUrl.isEmpty() || 
            username == null || username.isEmpty() || 
            password == null || password.isEmpty()) {
            System.out.println("⚠ Snowflake not configured - skipping auto-setup");
            return;
        }
        
        try {
            System.out.println("🔧 Auto-setting up Snowflake tables and data...");
            setupSnowflake();
            System.out.println("✅ Snowflake auto-setup completed!");
        } catch (Exception e) {
            System.err.println("⚠ Snowflake auto-setup failed: " + e.getMessage());
            System.err.println("   You may need to run the SQL manually in Snowflake");
        }
    }
    
    private void setupSnowflake() throws SQLException {
        Connection conn = getConnection();
        
        try {
            // Try to create database (might fail if no permission - that's ok)
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("CREATE DATABASE IF NOT EXISTS " + database);
                stmt.execute("USE DATABASE " + database);
            } catch (SQLException e) {
                // If we can't create database, try to use existing one
                System.out.println("   Note: Could not create database, using current database");
            }
            
            // Create schema
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("CREATE SCHEMA IF NOT EXISTS " + schema);
                stmt.execute("USE SCHEMA " + schema);
            } catch (SQLException e) {
                // Try PUBLIC schema if RAW doesn't work
                System.out.println("   Trying PUBLIC schema instead...");
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("USE SCHEMA PUBLIC");
                    schema = "PUBLIC";
                }
            }
            
            // Create tables
            createTables(conn);
            
            // Insert data (only if tables are empty)
            insertData(conn);
            
        } finally {
            conn.close();
        }
    }
    
    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(snowflakeUrl, username, password);
    }
    
    private void createTables(Connection conn) throws SQLException {
        try (Statement stmt = conn.createStatement()) {
            // Inventory table
            stmt.execute("CREATE TABLE IF NOT EXISTS inventory (" +
                "product_id VARCHAR(50) PRIMARY KEY, " +
                "current_inventory INTEGER NOT NULL, " +
                "reorder_point INTEGER NOT NULL, " +
                "safety_stock INTEGER NOT NULL, " +
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP())");
            
            // Suppliers table
            stmt.execute("CREATE TABLE IF NOT EXISTS suppliers (" +
                "supplier_id VARCHAR(50) NOT NULL, " +
                "supplier_name VARCHAR(100) NOT NULL, " +
                "product_id VARCHAR(50) NOT NULL, " +
                "lead_time_days INTEGER NOT NULL, " +
                "cost_per_unit DECIMAL(10,2) NOT NULL, " +
                "PRIMARY KEY (supplier_id, product_id))");
            
            // Demand history table
            stmt.execute("CREATE TABLE IF NOT EXISTS demand_history (" +
                "product_id VARCHAR(50) NOT NULL, " +
                "date DATE NOT NULL, " +
                "demand INTEGER NOT NULL, " +
                "PRIMARY KEY (product_id, date))");
            
            // Simulation results table
            stmt.execute("CREATE TABLE IF NOT EXISTS simulation_results (" +
                "result_id VARCHAR(50) PRIMARY KEY, " +
                "scenario_id VARCHAR(50) NOT NULL, " +
                "total_cost DECIMAL(15,2) NOT NULL, " +
                "service_level DECIMAL(5,2) NOT NULL, " +
                "inventory_cost DECIMAL(15,2) NOT NULL, " +
                "stockout_cost DECIMAL(15,2) NOT NULL, " +
                "average_inventory_level DECIMAL(10,2), " +
                "stockout_events INTEGER, " +
                "on_time_delivery DECIMAL(5,2), " +
                "total_orders INTEGER, " +
                "fulfilled_orders INTEGER, " +
                "completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP())");
            
            System.out.println("   ✓ Tables created");
        }
    }
    
    private void insertData(Connection conn) throws SQLException {
        try (Statement stmt = conn.createStatement()) {
            // Check if data already exists
            ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM inventory");
            rs.next();
            int count = rs.getInt(1);
            
            if (count > 0) {
                System.out.println("   ✓ Data already exists (" + count + " products)");
                return;
            }
            
            // Insert inventory
            stmt.execute("INSERT INTO inventory (product_id, current_inventory, reorder_point, safety_stock) VALUES " +
                "('PROD-001', 1000, 200, 100), " +
                "('PROD-002', 500, 150, 75), " +
                "('PROD-003', 750, 180, 90), " +
                "('PROD-004', 1200, 250, 125), " +
                "('PROD-005', 800, 200, 100), " +
                "('PROD-006', 600, 150, 75), " +
                "('PROD-007', 900, 220, 110), " +
                "('PROD-008', 1100, 240, 120), " +
                "('PROD-009', 700, 170, 85), " +
                "('PROD-010', 950, 210, 105)");
            
            // Insert suppliers
            stmt.execute("INSERT INTO suppliers (supplier_id, supplier_name, product_id, lead_time_days, cost_per_unit) VALUES " +
                "('SUPPLIER-001', 'Acme Corp', 'PROD-001', 7, 10.50), " +
                "('SUPPLIER-002', 'Global Supplies', 'PROD-002', 5, 8.75), " +
                "('SUPPLIER-003', 'Best Products', 'PROD-003', 6, 12.00), " +
                "('SUPPLIER-001', 'Acme Corp', 'PROD-004', 7, 15.25), " +
                "('SUPPLIER-004', 'Quality Goods', 'PROD-005', 4, 9.50), " +
                "('SUPPLIER-002', 'Global Supplies', 'PROD-006', 5, 11.00), " +
                "('SUPPLIER-005', 'Fast Delivery Inc', 'PROD-007', 3, 13.75), " +
                "('SUPPLIER-003', 'Best Products', 'PROD-008', 6, 14.50), " +
                "('SUPPLIER-004', 'Quality Goods', 'PROD-009', 4, 10.25), " +
                "('SUPPLIER-005', 'Fast Delivery Inc', 'PROD-010', 3, 16.00)");
            
            // Insert demand history
            stmt.execute("INSERT INTO demand_history (product_id, date, demand) " +
                "SELECT " +
                "  'PROD-' || LPAD(seq4() % 10 + 1, 3, '0') as product_id, " +
                "  DATEADD(day, -seq4(), CURRENT_DATE()) as date, " +
                "  100 + UNIFORM(0, 200, RANDOM()) as demand " +
                "FROM TABLE(GENERATOR(ROWCOUNT => 900))");
            
            System.out.println("   ✓ Sample data inserted");
        }
    }
}

