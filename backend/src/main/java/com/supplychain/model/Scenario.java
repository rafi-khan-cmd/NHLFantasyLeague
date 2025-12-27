package com.supplychain.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "scenarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Scenario {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(length = 1000)
    private String description;
    
    @Enumerated(EnumType.STRING)
    private ScenarioStatus status = ScenarioStatus.DRAFT;
    
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "scenario")
    private List<SupplierDelay> supplierDelays;
    
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "scenario")
    private List<DemandSpike> demandSpikes;
    
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "scenario")
    private List<InventoryAdjustment> inventoryAdjustments;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    public enum ScenarioStatus {
        DRAFT, ACTIVE, COMPLETED, FAILED
    }
}

