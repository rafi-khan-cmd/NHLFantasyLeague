package com.supplychain.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "supplier_delays")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupplierDelay {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String supplierId;
    
    @Column(nullable = false)
    private String supplierName;
    
    @Column(nullable = false)
    private Integer delayDays;
    
    @Column(nullable = false)
    private LocalDate startDate;
    
    @Column(nullable = false)
    private LocalDate endDate;
    
    @ManyToOne
    @JoinColumn(name = "scenario_id")
    private Scenario scenario;
}

