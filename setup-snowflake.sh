#!/bin/bash

# Snowflake Setup Script
# This script helps you set up Snowflake for the Supply Chain Digital Twin

echo "=========================================="
echo "Snowflake Setup for Supply Chain Digital Twin"
echo "=========================================="
echo ""

# Prompt for Snowflake credentials
echo "Enter your Snowflake credentials:"
read -p "Account Identifier (e.g., xxxxx-xxxxx): " SNOWFLAKE_ACCOUNT
read -p "Username: " SNOWFLAKE_USERNAME
read -sp "Password: " SNOWFLAKE_PASSWORD
echo ""

SNOWFLAKE_URL="https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com"

echo ""
echo "Account: ${SNOWFLAKE_ACCOUNT}"
echo "Username: ${SNOWFLAKE_USERNAME}"
echo "URL: ${SNOWFLAKE_URL}"
echo ""

# Create .env file
echo "Creating .env file..."
cat > backend/.env << EOF
# Snowflake Configuration
SNOWFLAKE_URL=jdbc:snowflake://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com:443/?warehouse=COMPUTE_WH&db=SUPPLYCHAIN&schema=RAW
SNOWFLAKE_USERNAME=${SNOWFLAKE_USERNAME}
SNOWFLAKE_PASSWORD=${SNOWFLAKE_PASSWORD}
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=SUPPLYCHAIN
SNOWFLAKE_SCHEMA=RAW

# Database Configuration
DB_USERNAME=postgres
DB_PASSWORD=postgres

# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
EOF

echo "✓ .env file created in backend/.env"
echo ""

# Check if snowflake-sql-cli is available
if command -v snowsql &> /dev/null; then
    echo "SnowSQL CLI found. Would you like to run the setup SQL automatically? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "Running setup SQL..."
        snowsql -a ${SNOWFLAKE_ACCOUNT} -u ${SNOWFLAKE_USERNAME} -f backend/src/main/resources/snowflake-setup.sql
        echo "✓ Setup SQL executed"
    fi
else
    echo "SnowSQL CLI not found. You'll need to run the SQL manually."
    echo ""
    echo "To set up the database:"
    echo "1. Go to: ${SNOWFLAKE_URL}"
    echo "2. Log in with username: ${SNOWFLAKE_USERNAME}"
    echo "3. Open a Worksheet"
    echo "4. Copy and paste the contents of: backend/src/main/resources/snowflake-setup.sql"
    echo "5. Run the SQL"
    echo ""
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Make sure you've run the SQL setup script in Snowflake"
echo "2. Start your backend: cd backend && ./mvnw spring-boot:run"
echo "3. Check the logs for any connection errors"
echo ""

