package com.supplychain.repository;

import com.supplychain.model.SimulationResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SimulationResultRepository extends JpaRepository<SimulationResult, String> {
    List<SimulationResult> findByScenarioIdIn(List<String> scenarioIds);
    SimulationResult findByJobId(String jobId);
}

