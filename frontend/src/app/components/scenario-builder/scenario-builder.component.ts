import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { SimulationService, Scenario, SupplierDelay, DemandSpike, InventoryAdjustment } from '../../services/simulation.service';

@Component({
  selector: 'app-scenario-builder',
  templateUrl: './scenario-builder.component.html',
  styleUrls: ['./scenario-builder.component.scss']
})
export class ScenarioBuilderComponent implements OnInit {
  scenarioForm: FormGroup;
  isSubmitting = false;
  submittedScenarios: Scenario[] = [];

  constructor(
    private fb: FormBuilder,
    private simulationService: SimulationService
  ) {
    this.scenarioForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      supplierDelays: this.fb.array([]),
      demandSpikes: this.fb.array([]),
      inventoryAdjustments: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadScenarios();
  }

  get supplierDelays(): FormArray {
    return this.scenarioForm.get('supplierDelays') as FormArray;
  }

  get demandSpikes(): FormArray {
    return this.scenarioForm.get('demandSpikes') as FormArray;
  }

  get inventoryAdjustments(): FormArray {
    return this.scenarioForm.get('inventoryAdjustments') as FormArray;
  }

  addSupplierDelay(): void {
    const delayForm = this.fb.group({
      supplierId: ['', Validators.required],
      supplierName: ['', Validators.required],
      delayDays: [0, [Validators.required, Validators.min(1)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
    this.supplierDelays.push(delayForm);
  }

  removeSupplierDelay(index: number): void {
    this.supplierDelays.removeAt(index);
  }

  addDemandSpike(): void {
    const spikeForm = this.fb.group({
      productId: ['', Validators.required],
      productName: ['', Validators.required],
      percentageIncrease: [0, [Validators.required, Validators.min(1)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
    this.demandSpikes.push(spikeForm);
  }

  removeDemandSpike(index: number): void {
    this.demandSpikes.removeAt(index);
  }

  addInventoryAdjustment(): void {
    const adjustmentForm = this.fb.group({
      productId: ['', Validators.required],
      productName: ['', Validators.required],
      adjustmentQuantity: [0, Validators.required],
      adjustmentType: ['increase', Validators.required]
    });
    this.inventoryAdjustments.push(adjustmentForm);
  }

  removeInventoryAdjustment(index: number): void {
    this.inventoryAdjustments.removeAt(index);
  }

  onSubmit(): void {
    if (this.scenarioForm.valid) {
      this.isSubmitting = true;
      const scenario: Scenario = this.scenarioForm.value;
      
      this.simulationService.createScenario(scenario).subscribe({
        next: (createdScenario) => {
          this.submittedScenarios.push(createdScenario);
          this.scenarioForm.reset();
          this.supplierDelays.clear();
          this.demandSpikes.clear();
          this.inventoryAdjustments.clear();
          this.isSubmitting = false;
          alert('Scenario created successfully!');
        },
        error: (error) => {
          console.error('Error creating scenario:', error);
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Unknown error occurred';
          alert(`Error creating scenario: ${errorMessage}\n\nPlease check:\n1. All required fields are filled\n2. Dates are in YYYY-MM-DD format\n3. Numbers are valid\n\nCheck browser console (F12) for details.`);
        }
      });
    } else {
      // Form is invalid - show which fields have errors
      const errors: string[] = [];
      if (this.scenarioForm.get('name')?.invalid) errors.push('Scenario Name is required');
      if (this.scenarioForm.get('description')?.invalid) errors.push('Description is required');
      
      // Check supplier delays
      this.supplierDelays.controls.forEach((control, index) => {
        if (control.invalid) {
          errors.push(`Supplier Delay ${index + 1} has invalid fields`);
        }
      });
      
      // Check demand spikes
      this.demandSpikes.controls.forEach((control, index) => {
        if (control.invalid) {
          errors.push(`Demand Spike ${index + 1} has invalid fields`);
        }
      });
      
      // Check inventory adjustments
      this.inventoryAdjustments.controls.forEach((control, index) => {
        if (control.invalid) {
          errors.push(`Inventory Adjustment ${index + 1} has invalid fields`);
        }
      });
      
      alert('Please fix the following errors:\n\n' + errors.join('\n') + '\n\nMake sure all required fields are filled correctly.');
    }
  }

  loadScenarios(): void {
    this.simulationService.getScenarios().subscribe({
      next: (scenarios) => {
        this.submittedScenarios = scenarios;
      },
      error: (error) => {
        console.error('Error loading scenarios:', error);
      }
    });
  }
}

