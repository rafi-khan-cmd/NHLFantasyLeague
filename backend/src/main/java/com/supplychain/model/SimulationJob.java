package com.supplychain.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "simulation_jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimulationJob {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String scenarioId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status = JobStatus.PENDING;
    
    @Column(name = "progress_percentage")
    private Integer progressPercentage = 0;
    
    @Column(name = "databricks_run_id")
    private String databricksRunId;
    
    @Column(name = "error_message", length = 2000)
    private String errorMessage;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "started_at")
    private LocalDateTime startedAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @OneToOne(cascade = CascadeType.ALL, mappedBy = "job")
    private SimulationResult result;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    public enum JobStatus {
        PENDING, RUNNING, COMPLETED, FAILED
    }
}

