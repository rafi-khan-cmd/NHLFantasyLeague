import { Component, OnInit } from '@angular/core';
import { SimulationService, Scenario, SimulationResult } from '../../services/simulation.service';

@Component({
  selector: 'app-scenario-comparison',
  templateUrl: './scenario-comparison.component.html',
  styleUrls: ['./scenario-comparison.component.scss']
})
export class ScenarioComparisonComponent implements OnInit {
  scenarios: Scenario[] = [];
  selectedScenarioIds: string[] = [];
  comparisonResults: SimulationResult[] = [];
  isLoading = false;
  isRunningSimulation = false;
  runningJobIds: { [scenarioId: string]: string } = {};

  constructor(private simulationService: SimulationService) { }

  ngOnInit(): void {
    this.loadScenarios();
  }

  loadScenarios(): void {
    this.isLoading = true;
    this.simulationService.getScenarios().subscribe({
      next: (scenarios) => {
        this.scenarios = scenarios;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading scenarios:', error);
        this.isLoading = false;
      }
    });
  }

  toggleScenarioSelection(scenarioId: string): void {
    const index = this.selectedScenarioIds.indexOf(scenarioId);
    if (index > -1) {
      this.selectedScenarioIds.splice(index, 1);
    } else {
      this.selectedScenarioIds.push(scenarioId);
    }
  }

  runSimulationForScenario(scenarioId: string): void {
    this.isRunningSimulation = true;
    this.simulationService.runSimulation(scenarioId).subscribe({
      next: (response) => {
        this.runningJobIds[scenarioId] = response.jobId;
        this.pollSimulationStatus(scenarioId, response.jobId);
      },
      error: (error) => {
        console.error('Error running simulation:', error);
        this.isRunningSimulation = false;
        alert('Error running simulation. Please try again.');
      }
    });
  }

  pollSimulationStatus(scenarioId: string, jobId: string): void {
    const interval = setInterval(() => {
      this.simulationService.getSimulationStatus(jobId).subscribe({
        next: (status) => {
          if (status.status === 'COMPLETED') {
            clearInterval(interval);
            this.loadSimulationResult(scenarioId, jobId);
          } else if (status.status === 'FAILED') {
            clearInterval(interval);
            this.isRunningSimulation = false;
            alert('Simulation failed. Please try again.');
          }
        },
        error: (error) => {
          clearInterval(interval);
          console.error('Error checking simulation status:', error);
          this.isRunningSimulation = false;
        }
      });
    }, 2000);
  }

  loadSimulationResult(scenarioId: string, jobId: string): void {
    this.simulationService.getSimulationResult(jobId).subscribe({
      next: (result) => {
        const existingIndex = this.comparisonResults.findIndex(r => r.scenarioId === scenarioId);
        if (existingIndex > -1) {
          this.comparisonResults[existingIndex] = result;
        } else {
          this.comparisonResults.push(result);
        }
        this.isRunningSimulation = false;
        delete this.runningJobIds[scenarioId];
      },
      error: (error) => {
        console.error('Error loading simulation result:', error);
        this.isRunningSimulation = false;
      }
    });
  }

  compareSelectedScenarios(): void {
    if (this.selectedScenarioIds.length < 2) {
      alert('Please select at least 2 scenarios to compare.');
      return;
    }

    this.isLoading = true;
    this.simulationService.compareScenarios(this.selectedScenarioIds).subscribe({
      next: (results) => {
        this.comparisonResults = results;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error comparing scenarios:', error);
        this.isLoading = false;
        alert('Error comparing scenarios. Please ensure all scenarios have completed simulations.');
      }
    });
  }

  getScenarioName(scenarioId: string): string {
    const scenario = this.scenarios.find(s => s.id === scenarioId);
    return scenario ? scenario.name : 'Unknown';
  }
}

