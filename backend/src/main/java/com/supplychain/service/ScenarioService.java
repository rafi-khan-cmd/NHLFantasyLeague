package com.supplychain.service;

import com.supplychain.dto.ScenarioDTO;
import com.supplychain.model.Scenario;
import com.supplychain.repository.ScenarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ScenarioService {
    
    @Autowired
    private ScenarioRepository scenarioRepository;
    
    @Transactional
    public ScenarioDTO createScenario(ScenarioDTO dto) {
        Scenario scenario = convertToEntity(dto);
        scenario = scenarioRepository.save(scenario);
        return convertToDTO(scenario);
    }
    
    public List<ScenarioDTO> getAllScenarios() {
        return scenarioRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public ScenarioDTO getScenarioById(String id) {
        Scenario scenario = scenarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Scenario not found: " + id));
        return convertToDTO(scenario);
    }
    
    private Scenario convertToEntity(ScenarioDTO dto) {
        Scenario scenario = new Scenario();
        scenario.setName(dto.getName());
        scenario.setDescription(dto.getDescription());
        
        if (dto.getSupplierDelays() != null) {
            scenario.setSupplierDelays(dto.getSupplierDelays().stream()
                    .map(sd -> {
                        com.supplychain.model.SupplierDelay delay = new com.supplychain.model.SupplierDelay();
                        delay.setSupplierId(sd.getSupplierId());
                        delay.setSupplierName(sd.getSupplierName());
                        delay.setDelayDays(sd.getDelayDays());
                        delay.setStartDate(sd.getStartDate());
                        delay.setEndDate(sd.getEndDate());
                        delay.setScenario(scenario);
                        return delay;
                    })
                    .collect(Collectors.toList()));
        }
        
        if (dto.getDemandSpikes() != null) {
            scenario.setDemandSpikes(dto.getDemandSpikes().stream()
                    .map(ds -> {
                        com.supplychain.model.DemandSpike spike = new com.supplychain.model.DemandSpike();
                        spike.setProductId(ds.getProductId());
                        spike.setProductName(ds.getProductName());
                        spike.setPercentageIncrease(ds.getPercentageIncrease());
                        spike.setStartDate(ds.getStartDate());
                        spike.setEndDate(ds.getEndDate());
                        spike.setScenario(scenario);
                        return spike;
                    })
                    .collect(Collectors.toList()));
        }
        
        if (dto.getInventoryAdjustments() != null) {
            scenario.setInventoryAdjustments(dto.getInventoryAdjustments().stream()
                    .map(ia -> {
                        com.supplychain.model.InventoryAdjustment adjustment = new com.supplychain.model.InventoryAdjustment();
                        adjustment.setProductId(ia.getProductId());
                        adjustment.setProductName(ia.getProductName());
                        adjustment.setAdjustmentQuantity(ia.getAdjustmentQuantity());
                        adjustment.setAdjustmentType(
                                com.supplychain.model.InventoryAdjustment.AdjustmentType.valueOf(ia.getAdjustmentType().toUpperCase())
                        );
                        adjustment.setScenario(scenario);
                        return adjustment;
                    })
                    .collect(Collectors.toList()));
        }
        
        return scenario;
    }
    
    private ScenarioDTO convertToDTO(Scenario scenario) {
        ScenarioDTO dto = new ScenarioDTO();
        dto.setId(scenario.getId());
        dto.setName(scenario.getName());
        dto.setDescription(scenario.getDescription());
        dto.setStatus(scenario.getStatus().name());
        
        if (scenario.getSupplierDelays() != null) {
            dto.setSupplierDelays(scenario.getSupplierDelays().stream()
                    .map(sd -> new ScenarioDTO.SupplierDelayDTO(
                            sd.getSupplierId(),
                            sd.getSupplierName(),
                            sd.getDelayDays(),
                            sd.getStartDate(),
                            sd.getEndDate()
                    ))
                    .collect(Collectors.toList()));
        }
        
        if (scenario.getDemandSpikes() != null) {
            dto.setDemandSpikes(scenario.getDemandSpikes().stream()
                    .map(ds -> new ScenarioDTO.DemandSpikeDTO(
                            ds.getProductId(),
                            ds.getProductName(),
                            ds.getPercentageIncrease(),
                            ds.getStartDate(),
                            ds.getEndDate()
                    ))
                    .collect(Collectors.toList()));
        }
        
        if (scenario.getInventoryAdjustments() != null) {
            dto.setInventoryAdjustments(scenario.getInventoryAdjustments().stream()
                    .map(ia -> new ScenarioDTO.InventoryAdjustmentDTO(
                            ia.getProductId(),
                            ia.getProductName(),
                            ia.getAdjustmentQuantity(),
                            ia.getAdjustmentType().name()
                    ))
                    .collect(Collectors.toList()));
        }
        
        return dto;
    }
}

