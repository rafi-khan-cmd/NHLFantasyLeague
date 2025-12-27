import { Component, OnInit } from '@angular/core';
import { SimulationService, Scenario, SimulationResult } from '../../services/simulation.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  scenarios: Scenario[] = [];
  recentResults: SimulationResult[] = [];
  isLoading = false;

  constructor(private simulationService: SimulationService) { }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.simulationService.getScenarios().subscribe({
      next: (scenarios) => {
        this.scenarios = scenarios;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      }
    });
  }

  getTotalScenarios(): number {
    return this.scenarios.length;
  }

  getActiveScenarios(): number {
    return this.scenarios.filter(s => s.status === 'ACTIVE').length;
  }
}

