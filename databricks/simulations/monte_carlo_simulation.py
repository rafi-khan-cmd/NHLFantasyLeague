"""
Monte Carlo Simulation for Supply Chain Digital Twin
Simulates supply chain scenarios with supplier delays, demand spikes, and inventory adjustments
"""

import sys
import argparse
import json
from datetime import datetime, timedelta
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, when, sum as spark_sum, avg, count, lit
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType, DateType
import numpy as np
import pandas as pd

def parse_arguments():
    parser = argparse.ArgumentParser(description='Run Monte Carlo simulation for supply chain scenario')
    parser.add_argument('--scenario-id', required=True, help='Scenario ID')
    parser.add_argument('--iterations', type=int, default=1000, help='Number of Monte Carlo iterations')
    parser.add_argument('--time-horizon-days', type=int, default=90, help='Simulation time horizon in days')
    return parser.parse_args()

def load_scenario_data(spark, scenario_id):
    """Load scenario configuration from Snowflake"""
    # In production, this would query Snowflake
    # For now, return mock data structure
    scenario_schema = StructType([
        StructField("scenario_id", StringType(), True),
        StructField("supplier_delays", StringType(), True),
        StructField("demand_spikes", StringType(), True),
        StructField("inventory_adjustments", StringType(), True)
    ])
    
    # Mock scenario data - replace with actual Snowflake query
    scenario_data = spark.createDataFrame([], scenario_schema)
    return scenario_data

def load_base_data(spark):
    """Load base supply chain data from Snowflake"""
    # In production, query Snowflake for:
    # - Current inventory levels
    # - Historical demand patterns
    # - Supplier lead times
    # - Product costs
    
    # Mock data structure
    inventory_schema = StructType([
        StructField("product_id", StringType(), True),
        StructField("current_inventory", IntegerType(), True),
        StructField("reorder_point", IntegerType(), True),
        StructField("safety_stock", IntegerType(), True)
    ])
    
    demand_schema = StructType([
        StructField("product_id", StringType(), True),
        StructField("date", DateType(), True),
        StructField("demand", IntegerType(), True)
    ])
    
    supplier_schema = StructType([
        StructField("supplier_id", StringType(), True),
        StructField("product_id", StringType(), True),
        StructField("lead_time_days", IntegerType(), True),
        StructField("cost_per_unit", DoubleType(), True)
    ])
    
    return {
        'inventory': spark.createDataFrame([], inventory_schema),
        'demand': spark.createDataFrame([], demand_schema),
        'suppliers': spark.createDataFrame([], supplier_schema)
    }

def apply_supplier_delays(base_data, supplier_delays):
    """Apply supplier delay scenarios to base data"""
    # Modify supplier lead times based on scenario
    suppliers_df = base_data['suppliers']
    
    for delay in supplier_delays:
        suppliers_df = suppliers_df.withColumn(
            "lead_time_days",
            when(
                (col("supplier_id") == delay['supplier_id']) &
                (col("date") >= delay['start_date']) &
                (col("date") <= delay['end_date']),
                col("lead_time_days") + delay['delay_days']
            ).otherwise(col("lead_time_days"))
        )
    
    base_data['suppliers'] = suppliers_df
    return base_data

def apply_demand_spikes(base_data, demand_spikes):
    """Apply demand spike scenarios to base data"""
    demand_df = base_data['demand']
    
    for spike in demand_spikes:
        demand_df = demand_df.withColumn(
            "demand",
            when(
                (col("product_id") == spike['product_id']) &
                (col("date") >= spike['start_date']) &
                (col("date") <= spike['end_date']),
                col("demand") * (1 + spike['percentage_increase'] / 100)
            ).otherwise(col("demand"))
        )
    
    base_data['demand'] = demand_df
    return base_data

def apply_inventory_adjustments(base_data, inventory_adjustments):
    """Apply inventory adjustment scenarios"""
    inventory_df = base_data['inventory']
    
    for adjustment in inventory_adjustments:
        if adjustment['adjustment_type'] == 'increase':
            inventory_df = inventory_df.withColumn(
                "current_inventory",
                when(
                    col("product_id") == adjustment['product_id'],
                    col("current_inventory") + adjustment['adjustment_quantity']
                ).otherwise(col("current_inventory"))
            )
        else:  # decrease
            inventory_df = inventory_df.withColumn(
                "current_inventory",
                when(
                    col("product_id") == adjustment['product_id'],
                    col("current_inventory") - adjustment['adjustment_quantity']
                ).otherwise(col("current_inventory"))
            )
    
    base_data['inventory'] = inventory_df
    return base_data

def run_monte_carlo_iteration(spark, base_data, iteration_num, time_horizon_days):
    """Run a single Monte Carlo iteration"""
    results = []
    
    # Simulate daily operations
    for day in range(time_horizon_days):
        current_date = datetime.now() + timedelta(days=day)
        
        # Simulate demand (with randomness)
        daily_demand = base_data['demand'].filter(col("date") == current_date)
        
        # Simulate inventory consumption
        # Simulate supplier deliveries
        # Calculate costs
        
        # Mock results for this iteration
        iteration_result = {
            'iteration': iteration_num,
            'day': day,
            'date': current_date,
            'total_inventory_cost': np.random.normal(1000, 200),
            'stockout_events': np.random.poisson(0.1),
            'orders_fulfilled': np.random.binomial(100, 0.95),
            'total_orders': 100
        }
        results.append(iteration_result)
    
    return results

def run_simulation(spark, scenario_id, iterations, time_horizon_days):
    """Run full Monte Carlo simulation"""
    print(f"Starting Monte Carlo simulation for scenario {scenario_id}")
    print(f"Iterations: {iterations}, Time horizon: {time_horizon_days} days")
    
    # Load scenario and base data
    scenario_data = load_scenario_data(spark, scenario_id)
    base_data = load_base_data(spark)
    
    # Apply scenario modifications
    # base_data = apply_supplier_delays(base_data, scenario_data.supplier_delays)
    # base_data = apply_demand_spikes(base_data, scenario_data.demand_spikes)
    # base_data = apply_inventory_adjustments(base_data, scenario_data.inventory_adjustments)
    
    # Run Monte Carlo iterations
    all_results = []
    for iteration in range(iterations):
        if iteration % 100 == 0:
            print(f"Running iteration {iteration}/{iterations}")
        iteration_results = run_monte_carlo_iteration(spark, base_data, iteration, time_horizon_days)
        all_results.extend(iteration_results)
    
    # Aggregate results
    results_df = spark.createDataFrame(all_results)
    
    # Calculate summary statistics
    summary = results_df.agg(
        spark_sum("total_inventory_cost").alias("total_cost"),
        avg("total_inventory_cost").alias("avg_inventory_cost"),
        spark_sum("stockout_events").alias("total_stockout_events"),
        avg("orders_fulfilled").alias("avg_orders_fulfilled"),
        spark_sum("total_orders").alias("total_orders")
    ).collect()[0]
    
    # Calculate service level
    total_orders = summary['total_orders']
    fulfilled_orders = summary['avg_orders_fulfilled'] * iterations
    service_level = (fulfilled_orders / total_orders * 100) if total_orders > 0 else 0
    
    # Prepare final results
    simulation_result = {
        'scenario_id': scenario_id,
        'total_cost': float(summary['total_cost']),
        'inventory_cost': float(summary['avg_inventory_cost']),
        'stockout_cost': float(summary['total_stockout_events'] * 1000),  # $1000 per stockout
        'service_level': float(service_level),
        'stockout_events': int(summary['total_stockout_events']),
        'total_orders': int(total_orders),
        'fulfilled_orders': int(fulfilled_orders),
        'on_time_delivery': float(service_level),  # Simplified
        'average_inventory_level': float(np.random.normal(1000, 100))  # Mock
    }
    
    return simulation_result

def save_results_to_snowflake(spark, results):
    """Save simulation results to Snowflake"""
    # In production, write results to Snowflake
    print(f"Saving results to Snowflake for scenario {results['scenario_id']}")
    # spark.write.format("snowflake").options(...).save()

def main():
    args = parse_arguments()
    
    # Initialize Spark session
    spark = SparkSession.builder \
        .appName("SupplyChainMonteCarlo") \
        .getOrCreate()
    
    try:
        # Run simulation
        results = run_simulation(
            spark,
            args.scenario_id,
            args.iterations,
            args.time_horizon_days
        )
        
        # Save results
        save_results_to_snowflake(spark, results)
        
        # Output results as JSON (for backend to consume)
        print(json.dumps(results))
        
    finally:
        spark.stop()

if __name__ == "__main__":
    main()

