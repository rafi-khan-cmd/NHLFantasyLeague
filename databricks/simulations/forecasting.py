"""
Demand and Supply Forecasting for Supply Chain Digital Twin
Uses time series forecasting to predict future demand and supply patterns
"""

import sys
import argparse
from datetime import datetime, timedelta
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, window, avg, sum as spark_sum
from pyspark.ml.regression import LinearRegression
from pyspark.ml.feature import VectorAssembler
import pandas as pd
import numpy as np

def parse_arguments():
    parser = argparse.ArgumentParser(description='Run forecasting for supply chain')
    parser.add_argument('--product-id', help='Specific product ID to forecast')
    parser.add_argument('--forecast-horizon-days', type=int, default=30, help='Forecast horizon in days')
    return parser.parse_args()

def load_historical_data(spark):
    """Load historical demand and supply data from Snowflake"""
    # In production, query Snowflake for historical data
    # Mock schema
    schema = {
        'demand': ['product_id', 'date', 'demand_quantity'],
        'supply': ['supplier_id', 'product_id', 'date', 'supply_quantity', 'lead_time']
    }
    
    # Return mock dataframes
    return {
        'demand': spark.createDataFrame([], schema['demand']),
        'supply': spark.createDataFrame([], schema['supply'])
    }

def prepare_time_series_features(df, date_col, value_col):
    """Prepare time series features for forecasting"""
    # Add lag features
    # Add seasonal features (day of week, month, etc.)
    # Add trend features
    
    df_with_features = df.withColumn(
        "day_of_week",
        col(date_col).cast("int") % 7
    ).withColumn(
        "month",
        col(date_col).cast("int") % 12
    )
    
    return df_with_features

def forecast_demand(spark, historical_demand, forecast_horizon_days):
    """Forecast future demand using time series analysis"""
    # Prepare features
    demand_with_features = prepare_time_series_features(
        historical_demand,
        "date",
        "demand_quantity"
    )
    
    # Simple moving average forecast (in production, use ARIMA, Prophet, etc.)
    window_spec = window(col("date"), "7 days")
    forecast_df = demand_with_features \
        .withColumn("forecast", avg("demand_quantity").over(window_spec))
    
    # Generate future dates
    last_date = historical_demand.select("date").orderBy(col("date").desc()).first()["date"]
    future_dates = [
        (last_date + timedelta(days=i),) 
        for i in range(1, forecast_horizon_days + 1)
    ]
    
    future_df = spark.createDataFrame(
        future_dates,
        ["date"]
    )
    
    # Apply forecast model
    # For simplicity, use last known average
    avg_demand = historical_demand.agg(avg("demand_quantity")).collect()[0][0]
    
    forecast_results = future_df.withColumn(
        "forecasted_demand",
        lit(avg_demand)
    )
    
    return forecast_results

def forecast_supply(spark, historical_supply, forecast_horizon_days):
    """Forecast future supply availability"""
    # Similar to demand forecasting
    # Consider supplier lead times and capacity constraints
    
    avg_supply = historical_supply.agg(avg("supply_quantity")).collect()[0][0]
    
    last_date = historical_supply.select("date").orderBy(col("date").desc()).first()["date"]
    future_dates = [
        (last_date + timedelta(days=i),) 
        for i in range(1, forecast_horizon_days + 1)
    ]
    
    future_df = spark.createDataFrame(future_dates, ["date"])
    
    forecast_results = future_df.withColumn(
        "forecasted_supply",
        lit(avg_supply)
    )
    
    return forecast_results

def calculate_forecast_metrics(actual, forecast):
    """Calculate forecast accuracy metrics"""
    # MAPE, RMSE, etc.
    mape = np.mean(np.abs((actual - forecast) / actual)) * 100
    rmse = np.sqrt(np.mean((actual - forecast) ** 2))
    
    return {
        'mape': mape,
        'rmse': rmse
    }

def main():
    args = parse_arguments()
    
    spark = SparkSession.builder \
        .appName("SupplyChainForecasting") \
        .getOrCreate()
    
    try:
        # Load historical data
        historical_data = load_historical_data(spark)
        
        # Forecast demand
        demand_forecast = forecast_demand(
            spark,
            historical_data['demand'],
            args.forecast_horizon_days
        )
        
        # Forecast supply
        supply_forecast = forecast_supply(
            spark,
            historical_data['supply'],
            args.forecast_horizon_days
        )
        
        # Save forecasts to Snowflake
        print("Forecasting completed")
        print(f"Demand forecast: {demand_forecast.count()} records")
        print(f"Supply forecast: {supply_forecast.count()} records")
        
    finally:
        spark.stop()

if __name__ == "__main__":
    main()

