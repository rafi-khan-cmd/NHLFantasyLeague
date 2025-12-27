package com.supplychain.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimulationResultDTO {
    private String scenarioId;
    private String scenarioName;
    private Double totalCost;
    private Double serviceLevel;
    private Double inventoryCost;
    private Double stockoutCost;
    private LocalDateTime completedAt;
    private SimulationMetricsDTO metrics;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulationMetricsDTO {
        private Double averageInventoryLevel;
        private Integer stockoutEvents;
        private Double onTimeDelivery;
        private Integer totalOrders;
        private Integer fulfilledOrders;
    }
}

