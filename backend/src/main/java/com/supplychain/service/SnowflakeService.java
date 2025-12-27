package com.supplychain.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for interacting with Snowflake data warehouse
 * Handles queries for inventory, orders, suppliers, and demand data
 */
@Service
public class SnowflakeService {
    
    @Value("${snowflake.url}")
    private String snowflakeUrl;
    
    @Value("${snowflake.username}")
    private String username;
    
    @Value("${snowflake.password}")
    private String password;
    
    @Value("${snowflake.warehouse:COMPUTE_WH}")
    private String warehouse;
    
    @Value("${snowflake.database:SUPPLYCHAIN}")
    private String database;
    
    @Value("${snowflake.schema:RAW}")
    private String schema;
    
    /**
     * Get connection to Snowflake
     */
    private Connection getConnection() throws SQLException {
        // Check if Snowflake is configured
        if (snowflakeUrl == null || snowflakeUrl.isEmpty() || 
            username == null || username.isEmpty() || 
            password == null || password.isEmpty()) {
            throw new SQLException("Snowflake not configured - missing credentials");
        }
        
        // The URL already contains db and schema, but we'll ensure they're set
        Connection conn = DriverManager.getConnection(snowflakeUrl, username, password);
        
        // Explicitly set database and schema
        try (java.sql.Statement stmt = conn.createStatement()) {
            stmt.execute("USE DATABASE " + database);
            stmt.execute("USE SCHEMA " + schema);
        }
        
        return conn;
    }
    
    /**
     * Load current inventory levels from Snowflake
     */
    public List<Map<String, Object>> getInventoryLevels() {
        List<Map<String, Object>> inventory = new ArrayList<>();
        
        String query = "SELECT product_id, current_inventory, reorder_point, safety_stock " +
                      "FROM inventory " +
                      "ORDER BY product_id";
        
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            while (rs.next()) {
                Map<String, Object> item = new HashMap<>();
                item.put("productId", rs.getString("product_id"));
                item.put("currentInventory", rs.getInt("current_inventory"));
                item.put("reorderPoint", rs.getInt("reorder_point"));
                item.put("safetyStock", rs.getInt("safety_stock"));
                inventory.add(item);
            }
        } catch (SQLException e) {
            System.err.println("Error loading inventory from Snowflake: " + e.getMessage());
            // Return empty list or mock data for development
            return getMockInventory();
        }
        
        return inventory;
    }
    
    /**
     * Load supplier information from Snowflake
     */
    public List<Map<String, Object>> getSuppliers() {
        List<Map<String, Object>> suppliers = new ArrayList<>();
        
        String query = "SELECT supplier_id, supplier_name, product_id, lead_time_days, cost_per_unit " +
                      "FROM suppliers " +
                      "ORDER BY supplier_id";
        
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            while (rs.next()) {
                Map<String, Object> supplier = new HashMap<>();
                supplier.put("supplierId", rs.getString("supplier_id"));
                supplier.put("supplierName", rs.getString("supplier_name"));
                supplier.put("productId", rs.getString("product_id"));
                supplier.put("leadTimeDays", rs.getInt("lead_time_days"));
                supplier.put("costPerUnit", rs.getDouble("cost_per_unit"));
                suppliers.add(supplier);
            }
        } catch (SQLException e) {
            System.err.println("Error loading suppliers from Snowflake: " + e.getMessage());
            return getMockSuppliers();
        }
        
        return suppliers;
    }
    
    /**
     * Load historical demand data from Snowflake
     */
    public List<Map<String, Object>> getDemandHistory(int days) {
        List<Map<String, Object>> demand = new ArrayList<>();
        
        String query = "SELECT product_id, date, demand " +
                      "FROM demand_history " +
                      "WHERE date >= DATEADD(day, -?, CURRENT_DATE()) " +
                      "ORDER BY product_id, date";
        
        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setInt(1, days);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> demandItem = new HashMap<>();
                    demandItem.put("productId", rs.getString("product_id"));
                    demandItem.put("date", rs.getDate("date"));
                    demandItem.put("demand", rs.getInt("demand"));
                    demand.add(demandItem);
                }
            }
        } catch (SQLException e) {
            System.err.println("Error loading demand history from Snowflake: " + e.getMessage());
            return getMockDemandHistory(days);
        }
        
        return demand;
    }
    
    /**
     * Save simulation results to Snowflake
     */
    public void saveSimulationResult(String scenarioId, Map<String, Object> results) {
        String query = "INSERT INTO simulation_results " +
                      "(scenario_id, total_cost, service_level, inventory_cost, stockout_cost, " +
                      "average_inventory_level, stockout_events, on_time_delivery, " +
                      "total_orders, fulfilled_orders, completed_at) " +
                      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP())";
        
        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, scenarioId);
            pstmt.setDouble(2, (Double) results.get("totalCost"));
            pstmt.setDouble(3, (Double) results.get("serviceLevel"));
            pstmt.setDouble(4, (Double) results.get("inventoryCost"));
            pstmt.setDouble(5, (Double) results.get("stockoutCost"));
            pstmt.setDouble(6, (Double) results.get("averageInventoryLevel"));
            pstmt.setInt(7, (Integer) results.get("stockoutEvents"));
            pstmt.setDouble(8, (Double) results.get("onTimeDelivery"));
            pstmt.setInt(9, (Integer) results.get("totalOrders"));
            pstmt.setInt(10, (Integer) results.get("fulfilledOrders"));
            
            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("Error saving simulation result to Snowflake: " + e.getMessage());
            // Log error but don't fail - results are also stored in PostgreSQL
        }
    }
    
    // Mock data methods for development/testing when Snowflake is not available
    private List<Map<String, Object>> getMockInventory() {
        List<Map<String, Object>> mock = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            Map<String, Object> item = new HashMap<>();
            item.put("productId", "PROD-" + String.format("%03d", i));
            item.put("currentInventory", 1000 + (i * 100));
            item.put("reorderPoint", 200);
            item.put("safetyStock", 100);
            mock.add(item);
        }
        return mock;
    }
    
    private List<Map<String, Object>> getMockSuppliers() {
        List<Map<String, Object>> mock = new ArrayList<>();
        String[] supplierNames = {"Acme Corp", "Global Supplies", "Best Products", "Quality Goods", "Fast Delivery Inc"};
        for (int i = 1; i <= 5; i++) {
            Map<String, Object> supplier = new HashMap<>();
            supplier.put("supplierId", "SUPPLIER-" + String.format("%03d", i));
            supplier.put("supplierName", supplierNames[i - 1]);
            supplier.put("productId", "PROD-" + String.format("%03d", (i % 10) + 1));
            supplier.put("leadTimeDays", 5 + i);
            supplier.put("costPerUnit", 10.0 + (i * 2.5));
            mock.add(supplier);
        }
        return mock;
    }
    
    private List<Map<String, Object>> getMockDemandHistory(int days) {
        List<Map<String, Object>> mock = new ArrayList<>();
        java.util.Date today = new java.util.Date();
        for (int day = 0; day < days; day++) {
            for (int prod = 1; prod <= 10; prod++) {
                Map<String, Object> demandItem = new HashMap<>();
                demandItem.put("productId", "PROD-" + String.format("%03d", prod));
                demandItem.put("date", new java.sql.Date(today.getTime() - (days - day) * 86400000L));
                demandItem.put("demand", 100 + (int)(Math.random() * 200));
                mock.add(demandItem);
            }
        }
        return mock;
    }
}

