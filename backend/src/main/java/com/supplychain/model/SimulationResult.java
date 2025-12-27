package com.supplychain.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "simulation_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimulationResult {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String scenarioId;
    
    @Column(nullable = false)
    private String scenarioName;
    
    @Column(name = "total_cost", nullable = false)
    private Double totalCost;
    
    @Column(name = "service_level", nullable = false)
    private Double serviceLevel;
    
    @Column(name = "inventory_cost", nullable = false)
    private Double inventoryCost;
    
    @Column(name = "stockout_cost", nullable = false)
    private Double stockoutCost;
    
    @Column(name = "average_inventory_level")
    private Double averageInventoryLevel;
    
    @Column(name = "stockout_events")
    private Integer stockoutEvents;
    
    @Column(name = "on_time_delivery")
    private Double onTimeDelivery;
    
    @Column(name = "total_orders")
    private Integer totalOrders;
    
    @Column(name = "fulfilled_orders")
    private Integer fulfilledOrders;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @OneToOne
    @JoinColumn(name = "job_id")
    private SimulationJob job;
    
    @PrePersist
    protected void onCreate() {
        completedAt = LocalDateTime.now();
    }
}

