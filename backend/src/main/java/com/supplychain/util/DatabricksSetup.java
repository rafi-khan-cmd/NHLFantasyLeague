package com.supplychain.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Utility class to help set up and test Databricks connection
 */
@Component
public class DatabricksSetup {
    
    @Value("${databricks.workspace-url:}")
    private String workspaceUrl;
    
    @Value("${databricks.access-token:}")
    private String accessToken;
    
    @Value("${databricks.cluster-id:}")
    private String clusterId;
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    /**
     * Test Databricks connection
     */
    public boolean testConnection() {
        if (workspaceUrl == null || workspaceUrl.isEmpty() || 
            accessToken == null || accessToken.isEmpty()) {
            System.out.println("⚠ Databricks not configured. Simulations will use mock mode.");
            return false;
        }
        
        try {
            String url = workspaceUrl + "/api/2.0/clusters/get";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);
            
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("cluster_id", clusterId);
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> cluster = response.getBody();
                System.out.println("✓ Databricks connection successful!");
                System.out.println("  Cluster: " + cluster.get("cluster_name"));
                System.out.println("  State: " + cluster.get("state"));
                return true;
            }
        } catch (Exception e) {
            System.err.println("✗ Databricks connection failed: " + e.getMessage());
            System.err.println("  The application will use mock simulation results.");
            return false;
        }
        
        return false;
    }
    
    /**
     * Check if cluster is running
     */
    public String getClusterStatus() {
        if (workspaceUrl == null || workspaceUrl.isEmpty() || 
            accessToken == null || accessToken.isEmpty() ||
            clusterId == null || clusterId.isEmpty()) {
            return "NOT_CONFIGURED";
        }
        
        try {
            String url = workspaceUrl + "/api/2.0/clusters/get";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);
            
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("cluster_id", clusterId);
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> cluster = response.getBody();
                return (String) cluster.get("state");
            }
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
        
        return "UNKNOWN";
    }
    
    /**
     * List available clusters (for debugging)
     */
    public void listClusters() {
        if (workspaceUrl == null || workspaceUrl.isEmpty() || 
            accessToken == null || accessToken.isEmpty()) {
            System.out.println("⚠ Databricks not configured.");
            return;
        }
        
        try {
            String url = workspaceUrl + "/api/2.0/clusters/list";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            
            HttpEntity<?> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                System.out.println("Available clusters:");
                // Parse and display clusters
            }
        } catch (Exception e) {
            System.err.println("Error listing clusters: " + e.getMessage());
        }
    }
}

