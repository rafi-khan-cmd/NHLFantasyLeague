package com.supplychain.controller;

import com.supplychain.util.SnowflakeSetup;
import com.supplychain.util.DatabricksSetup;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Setup and health check endpoints
 */
@RestController
@RequestMapping("/api/setup")
@CrossOrigin(origins = "*")
public class SetupController {
    
    @Autowired
    private SnowflakeSetup snowflakeSetup;
    
    @Autowired
    private DatabricksSetup databricksSetup;
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("snowflake", snowflakeSetup.testConnection() ? "CONNECTED" : "MOCK_MODE");
        response.put("databricks", databricksSetup.testConnection() ? "CONNECTED" : "MOCK_MODE");
        response.put("databricksClusterStatus", databricksSetup.getClusterStatus());
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/test-snowflake")
    public ResponseEntity<Map<String, Object>> testSnowflake() {
        Map<String, Object> response = new HashMap<>();
        boolean connected = snowflakeSetup.testConnection();
        response.put("connected", connected);
        response.put("message", connected ? "Successfully connected to Snowflake" : "Snowflake not configured or connection failed");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/test-databricks")
    public ResponseEntity<Map<String, Object>> testDatabricks() {
        Map<String, Object> response = new HashMap<>();
        boolean connected = databricksSetup.testConnection();
        String clusterStatus = databricksSetup.getClusterStatus();
        response.put("connected", connected);
        response.put("clusterStatus", clusterStatus);
        response.put("message", connected ? "Successfully connected to Databricks" : "Databricks not configured or connection failed");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/verify-tables")
    public ResponseEntity<Map<String, Object>> verifyTables() {
        Map<String, Object> response = new HashMap<>();
        snowflakeSetup.verifyTables();
        response.put("message", "Check server logs for table verification results");
        return ResponseEntity.ok(response);
    }
}

