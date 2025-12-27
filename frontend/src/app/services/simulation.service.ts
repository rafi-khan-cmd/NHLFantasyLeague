import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Scenario {
  id?: string;
  name: string;
  description: string;
  supplierDelays: SupplierDelay[];
  demandSpikes: DemandSpike[];
  inventoryAdjustments: InventoryAdjustment[];
  status?: string;
  createdAt?: Date;
}

export interface SupplierDelay {
  supplierId: string;
  supplierName: string;
  delayDays: number;
  startDate: Date;
  endDate: Date;
}

export interface DemandSpike {
  productId: string;
  productName: string;
  percentageIncrease: number;
  startDate: Date;
  endDate: Date;
}

export interface InventoryAdjustment {
  productId: string;
  productName: string;
  adjustmentQuantity: number;
  adjustmentType: 'increase' | 'decrease';
}

export interface SimulationResult {
  scenarioId: string;
  scenarioName: string;
  totalCost: number;
  serviceLevel: number;
  inventoryCost: number;
  stockoutCost: number;
  completedAt: Date;
  metrics: SimulationMetrics;
}

export interface SimulationMetrics {
  averageInventoryLevel: number;
  stockoutEvents: number;
  onTimeDelivery: number;
  totalOrders: number;
  fulfilledOrders: number;
}

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) { }

  createScenario(scenario: Scenario): Observable<Scenario> {
    return this.http.post<Scenario>(`${this.apiUrl}/scenarios`, scenario);
  }

  getScenarios(): Observable<Scenario[]> {
    return this.http.get<Scenario[]>(`${this.apiUrl}/scenarios`);
  }

  getScenario(id: string): Observable<Scenario> {
    return this.http.get<Scenario>(`${this.apiUrl}/scenarios/${id}`);
  }

  runSimulation(scenarioId: string): Observable<{ jobId: string }> {
    return this.http.post<{ jobId: string }>(`${this.apiUrl}/simulations/run`, { scenarioId });
  }

  getSimulationStatus(jobId: string): Observable<{ status: string; progress?: number }> {
    return this.http.get<{ status: string; progress?: number }>(`${this.apiUrl}/simulations/${jobId}/status`);
  }

  getSimulationResult(jobId: string): Observable<SimulationResult> {
    return this.http.get<SimulationResult>(`${this.apiUrl}/simulations/${jobId}/result`);
  }

  compareScenarios(scenarioIds: string[]): Observable<SimulationResult[]> {
    const params = new HttpParams().set('scenarioIds', scenarioIds.join(','));
    return this.http.get<SimulationResult[]>(`${this.apiUrl}/simulations/compare`, { params });
  }
}

