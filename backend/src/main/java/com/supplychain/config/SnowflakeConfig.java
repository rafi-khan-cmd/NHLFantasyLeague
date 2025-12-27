package com.supplychain.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Snowflake Configuration
 * Automatically configures Snowflake connection
 */
@Configuration
public class SnowflakeConfig {
    
    @Value("${snowflake.url:}")
    private String snowflakeUrl;
    
    @Value("${snowflake.username:}")
    private String username;
    
    @Value("${snowflake.password:}")
    private String password;
    
    @Bean
    @ConditionalOnProperty(name = "snowflake.url")
    public Connection snowflakeConnection() throws SQLException {
        if (snowflakeUrl == null || snowflakeUrl.isEmpty()) {
            return null;
        }
        
        try {
            // Load Snowflake JDBC driver
            Class.forName("net.snowflake.client.jdbc.SnowflakeDriver");
            
            // Create connection
            Connection conn = DriverManager.getConnection(snowflakeUrl, username, password);
            System.out.println("✓ Successfully connected to Snowflake");
            return conn;
        } catch (ClassNotFoundException e) {
            System.err.println("Snowflake JDBC driver not found. Make sure it's in your classpath.");
            return null;
        } catch (SQLException e) {
            System.err.println("Failed to connect to Snowflake: " + e.getMessage());
            System.err.println("The application will continue in mock mode.");
            return null;
        }
    }
}

