package com.supplychain.repository;

import com.supplychain.model.SimulationJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SimulationJobRepository extends JpaRepository<SimulationJob, String> {
    List<SimulationJob> findByScenarioId(String scenarioId);
    List<SimulationJob> findByStatus(SimulationJob.JobStatus status);
}

