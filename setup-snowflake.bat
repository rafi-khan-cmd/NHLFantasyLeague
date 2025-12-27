@echo off
REM Snowflake Setup Script for Windows
REM This script helps you set up Snowflake for the Supply Chain Digital Twin

echo ==========================================
echo Snowflake Setup for Supply Chain Digital Twin
echo ==========================================
echo.

REM Your Snowflake credentials
set SNOWFLAKE_ACCOUNT=qrwtuns-zn65184
set SNOWFLAKE_USERNAME=rafi
set SNOWFLAKE_URL=https://%SNOWFLAKE_ACCOUNT%.snowflakecomputing.com

echo Account: %SNOWFLAKE_ACCOUNT%
echo Username: %SNOWFLAKE_USERNAME%
echo URL: %SNOWFLAKE_URL%
echo.

REM Prompt for password
set /p SNOWFLAKE_PASSWORD="Enter your Snowflake password: "

REM Create .env file
echo Creating .env file...
(
echo # Snowflake Configuration
echo SNOWFLAKE_URL=jdbc:snowflake://%SNOWFLAKE_ACCOUNT%.snowflakecomputing.com:443/?warehouse=COMPUTE_WH^&db=SUPPLYCHAIN^&schema=RAW
echo SNOWFLAKE_USERNAME=%SNOWFLAKE_USERNAME%
echo SNOWFLAKE_PASSWORD=%SNOWFLAKE_PASSWORD%
echo SNOWFLAKE_WAREHOUSE=COMPUTE_WH
echo SNOWFLAKE_DATABASE=SUPPLYCHAIN
echo SNOWFLAKE_SCHEMA=RAW
echo.
echo # Database Configuration
echo DB_USERNAME=postgres
echo DB_PASSWORD=postgres
echo.
echo # RabbitMQ Configuration
echo RABBITMQ_HOST=localhost
echo RABBITMQ_PORT=5672
echo RABBITMQ_USERNAME=guest
echo RABBITMQ_PASSWORD=guest
echo.
echo # Kafka Configuration
echo KAFKA_BOOTSTRAP_SERVERS=localhost:9092
) > backend\.env

echo .env file created in backend\.env
echo.

echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Go to: %SNOWFLAKE_URL%
echo 2. Log in with username: %SNOWFLAKE_USERNAME%
echo 3. Open a Worksheet
echo 4. Copy and paste the contents of: backend\src\main\resources\snowflake-setup.sql
echo 5. Run the SQL
echo 6. Start your backend: cd backend ^&^& mvnw.cmd spring-boot:run
echo.

pause

