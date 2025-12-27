package com.supplychain.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "inventory_adjustments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryAdjustment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String productId;
    
    @Column(nullable = false)
    private String productName;
    
    @Column(nullable = false)
    private Integer adjustmentQuantity;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdjustmentType adjustmentType;
    
    @ManyToOne
    @JoinColumn(name = "scenario_id")
    private Scenario scenario;
    
    public enum AdjustmentType {
        INCREASE, DECREASE
    }
}

