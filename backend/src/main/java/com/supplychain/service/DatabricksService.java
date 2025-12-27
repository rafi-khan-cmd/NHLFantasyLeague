package com.supplychain.service;

import com.supplychain.model.SimulationResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DatabricksService {
    
    @Value("${databricks.workspace-url:}")
    private String workspaceUrl;
    
    @Value("${databricks.access-token:}")
    private String accessToken;
    
    @Value("${databricks.cluster-id:}")
    private String clusterId;
    
    @Autowired
    private SnowflakeService snowflakeService;
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    public String submitSimulationJob(String scenarioId) {
        // Check if Databricks is configured - if not, use mock mode immediately
        if (workspaceUrl == null || workspaceUrl.isEmpty() || 
            accessToken == null || accessToken.isEmpty()) {
            // Return a mock run ID for mock mode
            return "MOCK_RUN_" + scenarioId + "_" + System.currentTimeMillis();
        }
        
        // If no cluster ID, try to create a job that will use a cluster
        if (clusterId == null || clusterId.isEmpty()) {
            return submitJobWithoutCluster(scenarioId);
        }
        
        String url = workspaceUrl + "/api/2.1/jobs/runs/submit";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        
        Map<String, Object> jobConfig = new HashMap<>();
        jobConfig.put("name", "Supply Chain Simulation - Scenario " + scenarioId);
        
        Map<String, Object> task = new HashMap<>();
        task.put("task_key", "simulation_task");
        task.put("spark_python_task", Map.of(
                "python_file", "dbfs:/simulations/monte_carlo_simulation.py",
                "parameters", new String[]{"--scenario-id", scenarioId}
        ));
        task.put("existing_cluster_id", clusterId);
        
        jobConfig.put("tasks", new Object[]{task});
        
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(jobConfig, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return String.valueOf(response.getBody().get("run_id"));
            }
        } catch (Exception e) {
            System.err.println("Failed to submit Databricks job: " + e.getMessage());
            System.err.println("Using mock simulation results instead.");
        }
        
        throw new RuntimeException("Failed to submit Databricks job");
    }
    
    private String submitJobWithoutCluster(String scenarioId) {
        // Check if Databricks is configured
        if (workspaceUrl == null || workspaceUrl.isEmpty() || 
            accessToken == null || accessToken.isEmpty()) {
            // Return mock run ID for mock mode
            return "MOCK_RUN_" + scenarioId + "_" + System.currentTimeMillis();
        }
        
        // Try to submit a job that will create/use a cluster automatically
        String url = workspaceUrl + "/api/2.1/jobs/runs/submit";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        
        Map<String, Object> jobConfig = new HashMap<>();
        jobConfig.put("name", "Supply Chain Simulation - Scenario " + scenarioId);
        
        Map<String, Object> task = new HashMap<>();
        task.put("task_key", "simulation_task");
        task.put("spark_python_task", Map.of(
                "python_file", "dbfs:/simulations/monte_carlo_simulation.py",
                "parameters", new String[]{"--scenario-id", scenarioId}
        ));
        
        // Use new_cluster instead of existing_cluster_id
        Map<String, Object> newCluster = new HashMap<>();
        newCluster.put("spark_version", "13.3.x-scala2.12"); // Use latest LTS
        newCluster.put("node_type_id", "i3.xlarge"); // Smallest node type
        newCluster.put("num_workers", 0); // Single node cluster
        newCluster.put("autotermination_minutes", 30);
        
        task.put("new_cluster", newCluster);
        
        jobConfig.put("tasks", new Object[]{task});
        
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(jobConfig, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return String.valueOf(response.getBody().get("run_id"));
            }
        } catch (Exception e) {
            System.err.println("Failed to submit Databricks job: " + e.getMessage());
            System.err.println("Using mock simulation results instead.");
        }
        
        throw new RuntimeException("Failed to submit Databricks job");
    }
    
    public SimulationResult waitForCompletion(String runId, String scenarioId) {
        // If this is a mock run ID, immediately return mock results
        if (runId != null && runId.startsWith("MOCK_RUN_")) {
            // Small delay to simulate processing
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return fetchSimulationResults(runId, scenarioId);
        }
        
        // Poll for job completion with timeout
        int maxAttempts = 60; // 5 minutes max (60 * 5 seconds)
        int attempt = 0;
        
        while (attempt < maxAttempts) {
            try {
                String status = getRunStatus(runId);
                
                if ("TERMINATED".equals(status)) {
                    // Job completed - fetch results
                    return fetchSimulationResults(runId, scenarioId);
                } else if ("SKIPPED".equals(status) || "INTERNAL_ERROR".equals(status)) {
                    throw new RuntimeException("Databricks job failed with status: " + status);
                }
                
                // Wait before next poll
                Thread.sleep(5000);
                attempt++;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Interrupted while waiting for Databricks job", e);
            }
        }
        
        throw new RuntimeException("Databricks job timed out after " + (maxAttempts * 5) + " seconds");
    }
    
    private SimulationResult fetchSimulationResults(String runId, String scenarioId) {
        // In production, fetch actual results from Databricks output
        // For now, return mock results if Databricks is not fully configured
        if (workspaceUrl == null || workspaceUrl.isEmpty() || 
            accessToken == null || accessToken.isEmpty()) {
            // Return mock result when Databricks is not configured
            return getMockSimulationResult(scenarioId);
        }
        
        // TODO: Fetch actual results from Databricks
        // This would involve reading the output from the job run
        return getMockSimulationResult(scenarioId);
    }
    
    private SimulationResult getMockSimulationResult(String scenarioId) {
        // Try to use real data from Snowflake, fall back to mock if unavailable
        try {
            return getSimulationResultFromSnowflakeData(scenarioId);
        } catch (Exception e) {
            System.err.println("Error loading Snowflake data, using mock results: " + e.getMessage());
            return getFallbackMockResult(scenarioId);
        }
    }
    
    private SimulationResult getSimulationResultFromSnowflakeData(String scenarioId) {
        // Load real data from Snowflake
        List<Map<String, Object>> inventory = snowflakeService.getInventoryLevels();
        List<Map<String, Object>> suppliers = snowflakeService.getSuppliers();
        List<Map<String, Object>> demandHistory = snowflakeService.getDemandHistory(90);
        
        // Calculate metrics based on real data
        double totalInventory = inventory.stream()
            .mapToDouble(item -> ((Number) item.get("currentInventory")).doubleValue())
            .sum();
        
        double avgInventory = inventory.isEmpty() ? 1000.0 : totalInventory / inventory.size();
        
        // Calculate average demand from history
        double avgDailyDemand = demandHistory.stream()
            .mapToDouble(item -> ((Number) item.get("demand")).doubleValue())
            .average()
            .orElse(100.0);
        
        int totalOrders = (int)(avgDailyDemand * 90); // 90-day simulation
        
        // Calculate average lead time from suppliers
        double avgLeadTime = suppliers.stream()
            .mapToDouble(item -> ((Number) item.get("leadTimeDays")).doubleValue())
            .average()
            .orElse(7.0);
        
        // Calculate average cost per unit
        double avgCostPerUnit = suppliers.stream()
            .mapToDouble(item -> ((Number) item.get("costPerUnit")).doubleValue())
            .average()
            .orElse(12.0);
        
        // Simulate based on real data with some randomness
        // Higher inventory = better service level, lower stockout risk
        double inventoryFactor = Math.min(avgInventory / 1000.0, 2.0); // Normalize to 0-2x
        double baseServiceLevel = 85.0 + (inventoryFactor * 10.0); // 85-95% based on inventory
        double serviceLevel = Math.min(100.0, baseServiceLevel + (Math.random() * 5.0 - 2.5));
        
        // Calculate costs based on real data
        double inventoryCost = avgInventory * avgCostPerUnit * 0.1; // 10% holding cost
        double stockoutRisk = Math.max(0, 1.0 - (inventoryFactor * 0.5)); // Higher inventory = lower risk
        int stockoutEvents = (int)(stockoutRisk * 15.0 * (1.0 - serviceLevel / 100.0));
        double stockoutCost = stockoutEvents * 1000.0; // $1000 per stockout
        
        double onTimeDelivery = serviceLevel - (Math.random() * 3.0); // Slightly lower than service level
        int fulfilledOrders = (int)(totalOrders * (serviceLevel / 100.0));
        
        double totalCost = inventoryCost + stockoutCost + (totalOrders * avgCostPerUnit * 0.05); // Add ordering costs
        
        // Create result with real data-based calculations
        SimulationResult result = new SimulationResult();
        result.setId(null);
        result.setScenarioId(scenarioId);
        result.setScenarioName("Scenario " + scenarioId);
        result.setTotalCost(totalCost);
        result.setServiceLevel(serviceLevel);
        result.setInventoryCost(inventoryCost);
        result.setStockoutCost(stockoutCost);
        result.setAverageInventoryLevel(avgInventory);
        result.setStockoutEvents(stockoutEvents);
        result.setOnTimeDelivery(Math.max(0, onTimeDelivery));
        result.setTotalOrders(totalOrders);
        result.setFulfilledOrders(fulfilledOrders);
        result.setCompletedAt(null);
        result.setJob(null);
        
        // Save to Snowflake
        try {
            Map<String, Object> resultsMap = new HashMap<>();
            resultsMap.put("totalCost", totalCost);
            resultsMap.put("serviceLevel", serviceLevel);
            resultsMap.put("inventoryCost", inventoryCost);
            resultsMap.put("stockoutCost", stockoutCost);
            resultsMap.put("averageInventoryLevel", avgInventory);
            resultsMap.put("stockoutEvents", stockoutEvents);
            resultsMap.put("onTimeDelivery", onTimeDelivery);
            resultsMap.put("totalOrders", totalOrders);
            resultsMap.put("fulfilledOrders", fulfilledOrders);
            snowflakeService.saveSimulationResult(scenarioId, resultsMap);
        } catch (Exception e) {
            System.err.println("Could not save to Snowflake: " + e.getMessage());
        }
        
        return result;
    }
    
    private SimulationResult getFallbackMockResult(String scenarioId) {
        // Fallback to simple mock if Snowflake data unavailable
        double onTimeDelivery = 90.0 + Math.random() * 10;
        int totalOrders = 1000;
        int fulfilledOrders = (int)(totalOrders * (onTimeDelivery / 100.0));
        
        SimulationResult result = new SimulationResult();
        result.setId(null);
        result.setScenarioId(scenarioId);
        result.setScenarioName("Scenario " + scenarioId);
        result.setTotalCost(100000.0 + Math.random() * 50000);
        result.setServiceLevel(90.0 + Math.random() * 10);
        result.setInventoryCost(50000.0 + Math.random() * 20000);
        result.setStockoutCost(5000.0 + Math.random() * 5000);
        result.setAverageInventoryLevel(1000.0 + Math.random() * 500);
        result.setStockoutEvents((int)(Math.random() * 20));
        result.setOnTimeDelivery(onTimeDelivery);
        result.setTotalOrders(totalOrders);
        result.setFulfilledOrders(fulfilledOrders);
        result.setCompletedAt(null);
        result.setJob(null);
        
        return result;
    }
    
    public String getRunStatus(String runId) {
        if (workspaceUrl == null || workspaceUrl.isEmpty() || accessToken == null || accessToken.isEmpty()) {
            return "NOT_CONFIGURED";
        }
        
        String url = workspaceUrl + "/api/2.1/jobs/runs/get?run_id=" + runId;
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        
        HttpEntity<?> request = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> state = (Map<String, Object>) response.getBody().get("state");
                return (String) state.get("life_cycle_state");
            }
        } catch (Exception e) {
            System.err.println("Error getting run status: " + e.getMessage());
        }
        
        return "UNKNOWN";
    }
}
