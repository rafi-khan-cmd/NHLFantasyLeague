package com.supplychain.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.sql.*;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * Utility class to help set up Snowflake database
 * Can be run manually to verify connection and set up tables
 */
@Component
public class SnowflakeSetup {
    
    @Value("${snowflake.url:}")
    private String snowflakeUrl;
    
    @Value("${snowflake.username:}")
    private String username;
    
    @Value("${snowflake.password:}")
    private String password;
    
    /**
     * Test Snowflake connection
     */
    public boolean testConnection() {
        if (snowflakeUrl == null || snowflakeUrl.isEmpty()) {
            System.out.println("⚠ Snowflake URL not configured. Using mock mode.");
            return false;
        }
        
        try {
            Class.forName("net.snowflake.client.jdbc.SnowflakeDriver");
            Connection conn = DriverManager.getConnection(snowflakeUrl, username, password);
            
            // Test query
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SELECT CURRENT_VERSION()");
            if (rs.next()) {
                System.out.println("✓ Snowflake connection successful!");
                System.out.println("  Version: " + rs.getString(1));
            }
            
            conn.close();
            return true;
        } catch (Exception e) {
            System.err.println("✗ Snowflake connection failed: " + e.getMessage());
            System.err.println("  The application will use mock data.");
            return false;
        }
    }
    
    /**
     * Run setup SQL from file
     */
    public void runSetupSQL() {
        if (snowflakeUrl == null || snowflakeUrl.isEmpty()) {
            System.out.println("⚠ Snowflake not configured. Cannot run setup SQL.");
            return;
        }
        
        try {
            // Read SQL file
            String sql = new String(Files.readAllBytes(
                Paths.get("src/main/resources/snowflake-setup.sql")
            ));
            
            Connection conn = DriverManager.getConnection(snowflakeUrl, username, password);
            Statement stmt = conn.createStatement();
            
            // Split by semicolons and execute each statement
            String[] statements = sql.split(";");
            for (String statement : statements) {
                statement = statement.trim();
                if (!statement.isEmpty() && !statement.startsWith("--")) {
                    try {
                        stmt.execute(statement);
                        System.out.println("✓ Executed: " + statement.substring(0, Math.min(50, statement.length())) + "...");
                    } catch (SQLException e) {
                        System.err.println("✗ Error executing: " + statement.substring(0, Math.min(50, statement.length())));
                        System.err.println("  " + e.getMessage());
                    }
                }
            }
            
            conn.close();
            System.out.println("✓ Setup SQL completed!");
        } catch (Exception e) {
            System.err.println("✗ Failed to run setup SQL: " + e.getMessage());
        }
    }
    
    /**
     * Verify tables exist
     */
    public void verifyTables() {
        if (snowflakeUrl == null || snowflakeUrl.isEmpty()) {
            return;
        }
        
        String[] tables = {"inventory", "suppliers", "demand_history", "orders", "simulation_results"};
        
        try {
            Connection conn = DriverManager.getConnection(snowflakeUrl, username, password);
            Statement stmt = conn.createStatement();
            
            System.out.println("Verifying tables...");
            for (String table : tables) {
                ResultSet rs = stmt.executeQuery(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '" + table.toUpperCase() + "'"
                );
                if (rs.next() && rs.getInt(1) > 0) {
                    System.out.println("  ✓ Table exists: " + table);
                } else {
                    System.out.println("  ✗ Table missing: " + table);
                }
            }
            
            conn.close();
        } catch (Exception e) {
            System.err.println("✗ Error verifying tables: " + e.getMessage());
        }
    }
}

