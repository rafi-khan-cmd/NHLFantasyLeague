import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ScenarioBuilderComponent } from './components/scenario-builder/scenario-builder.component';
import { ScenarioComparisonComponent } from './components/scenario-comparison/scenario-comparison.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'scenario-builder', component: ScenarioBuilderComponent },
  { path: 'scenario-comparison', component: ScenarioComparisonComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

