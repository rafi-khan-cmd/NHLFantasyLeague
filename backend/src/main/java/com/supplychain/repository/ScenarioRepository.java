package com.supplychain.repository;

import com.supplychain.model.Scenario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScenarioRepository extends JpaRepository<Scenario, String> {
    List<Scenario> findByStatus(Scenario.ScenarioStatus status);
}

