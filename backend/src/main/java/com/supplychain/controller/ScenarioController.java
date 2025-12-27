package com.supplychain.controller;

import com.supplychain.dto.ScenarioDTO;
import com.supplychain.service.ScenarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scenarios")
@CrossOrigin(origins = "*")
public class ScenarioController {
    
    @Autowired
    private ScenarioService scenarioService;
    
    @PostMapping
    public ResponseEntity<ScenarioDTO> createScenario(@RequestBody ScenarioDTO scenarioDTO) {
        ScenarioDTO created = scenarioService.createScenario(scenarioDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    @GetMapping
    public ResponseEntity<List<ScenarioDTO>> getAllScenarios() {
        List<ScenarioDTO> scenarios = scenarioService.getAllScenarios();
        return ResponseEntity.ok(scenarios);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ScenarioDTO> getScenario(@PathVariable String id) {
        ScenarioDTO scenario = scenarioService.getScenarioById(id);
        return ResponseEntity.ok(scenario);
    }
}

