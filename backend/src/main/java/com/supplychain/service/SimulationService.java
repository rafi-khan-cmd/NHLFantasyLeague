package com.supplychain.service;

import com.supplychain.dto.SimulationResultDTO;
import com.supplychain.model.Scenario;
import com.supplychain.model.SimulationJob;
import com.supplychain.model.SimulationResult;
import com.supplychain.repository.ScenarioRepository;
import com.supplychain.repository.SimulationJobRepository;
import com.supplychain.repository.SimulationResultRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SimulationService {
    
    @Autowired
    private ScenarioRepository scenarioRepository;
    
    @Autowired
    private SimulationJobRepository jobRepository;
    
    @Autowired
    private SimulationResultRepository resultRepository;
    
    @Autowired
    private DatabricksService databricksService;
    
    @Transactional
    public String runSimulation(String scenarioId) {
        Scenario scenario = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new RuntimeException("Scenario not found: " + scenarioId));
        
        SimulationJob job = new SimulationJob();
        job.setScenarioId(scenarioId);
        job.setStatus(SimulationJob.JobStatus.PENDING);
        job = jobRepository.save(job);
        
        // Trigger async simulation
        executeSimulation(job.getId(), scenarioId);
        
        return job.getId();
    }
    
    @Async
    public void executeSimulation(String jobId, String scenarioId) {
        SimulationJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));
        
        try {
            job.setStatus(SimulationJob.JobStatus.RUNNING);
            job.setStartedAt(java.time.LocalDateTime.now());
            jobRepository.save(job);
            
            // Submit to Databricks
            String runId = databricksService.submitSimulationJob(scenarioId);
            job.setDatabricksRunId(runId);
            jobRepository.save(job);
            
            // Poll for completion (simplified - in production, use proper async handling)
            SimulationResult result = databricksService.waitForCompletion(runId, scenarioId);
            
            result.setJob(job);
            result = resultRepository.save(result);
            
            job.setResult(result);
            job.setStatus(SimulationJob.JobStatus.COMPLETED);
            job.setCompletedAt(java.time.LocalDateTime.now());
            job.setProgressPercentage(100);
            jobRepository.save(job);
            
        } catch (Exception e) {
            job.setStatus(SimulationJob.JobStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(java.time.LocalDateTime.now());
            jobRepository.save(job);
        }
    }
    
    public SimulationJob.JobStatus getJobStatus(String jobId) {
        SimulationJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));
        return job.getStatus();
    }
    
    public SimulationResultDTO getSimulationResult(String jobId) {
        SimulationResult result = resultRepository.findByJobId(jobId);
        if (result == null) {
            throw new RuntimeException("Result not found for job: " + jobId);
        }
        return convertToDTO(result);
    }
    
    public List<SimulationResultDTO> compareScenarios(List<String> scenarioIds) {
        List<SimulationResult> results = resultRepository.findByScenarioIdIn(scenarioIds);
        return results.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    private SimulationResultDTO convertToDTO(SimulationResult result) {
        SimulationResultDTO dto = new SimulationResultDTO();
        dto.setScenarioId(result.getScenarioId());
        dto.setScenarioName(result.getScenarioName());
        dto.setTotalCost(result.getTotalCost());
        dto.setServiceLevel(result.getServiceLevel());
        dto.setInventoryCost(result.getInventoryCost());
        dto.setStockoutCost(result.getStockoutCost());
        dto.setCompletedAt(result.getCompletedAt());
        
        SimulationResultDTO.SimulationMetricsDTO metrics = new SimulationResultDTO.SimulationMetricsDTO();
        metrics.setAverageInventoryLevel(result.getAverageInventoryLevel());
        metrics.setStockoutEvents(result.getStockoutEvents());
        metrics.setOnTimeDelivery(result.getOnTimeDelivery());
        metrics.setTotalOrders(result.getTotalOrders());
        metrics.setFulfilledOrders(result.getFulfilledOrders());
        dto.setMetrics(metrics);
        
        return dto;
    }
}

