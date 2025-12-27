package com.supplychain.dto;

import com.supplychain.model.Scenario;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioDTO {
    private String id;
    private String name;
    private String description;
    private String status;
    private List<SupplierDelayDTO> supplierDelays;
    private List<DemandSpikeDTO> demandSpikes;
    private List<InventoryAdjustmentDTO> inventoryAdjustments;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SupplierDelayDTO {
        private String supplierId;
        private String supplierName;
        private Integer delayDays;
        private LocalDate startDate;
        private LocalDate endDate;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DemandSpikeDTO {
        private String productId;
        private String productName;
        private Double percentageIncrease;
        private LocalDate startDate;
        private LocalDate endDate;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InventoryAdjustmentDTO {
        private String productId;
        private String productName;
        private Integer adjustmentQuantity;
        private String adjustmentType;
    }
}

