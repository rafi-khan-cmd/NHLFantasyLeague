package com.supplychain.controller;

import com.supplychain.dto.SimulationResultDTO;
import com.supplychain.model.SimulationJob;
import com.supplychain.service.SimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/simulations")
@CrossOrigin(origins = "*")
public class SimulationController {
    
    @Autowired
    private SimulationService simulationService;
    
    @PostMapping("/run")
    public ResponseEntity<Map<String, String>> runSimulation(@RequestBody Map<String, String> request) {
        String scenarioId = request.get("scenarioId");
        String jobId = simulationService.runSimulation(scenarioId);
        return ResponseEntity.ok(Map.of("jobId", jobId));
    }
    
    @GetMapping("/{jobId}/status")
    public ResponseEntity<Map<String, Object>> getSimulationStatus(@PathVariable String jobId) {
        SimulationJob.JobStatus status = simulationService.getJobStatus(jobId);
        return ResponseEntity.ok(Map.of("status", status.name()));
    }
    
    @GetMapping("/{jobId}/result")
    public ResponseEntity<SimulationResultDTO> getSimulationResult(@PathVariable String jobId) {
        SimulationResultDTO result = simulationService.getSimulationResult(jobId);
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/compare")
    public ResponseEntity<List<SimulationResultDTO>> compareScenarios(
            @RequestParam("scenarioIds") List<String> scenarioIds) {
        List<SimulationResultDTO> results = simulationService.compareScenarios(scenarioIds);
        return ResponseEntity.ok(results);
    }
}

