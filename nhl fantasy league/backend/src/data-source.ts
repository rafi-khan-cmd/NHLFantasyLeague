import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

// Support both DATABASE_URL (Railway format) and individual variables
const getDataSourceOptions = (): DataSourceOptions => {
  const databaseUrl = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
  
  // In production, use dist folder; in development, use src folder
  const baseDir = isProduction ? __dirname.replace('/dist', '') : __dirname;
  const entitiesPath = isProduction 
    ? __dirname + '/**/*.entity{.js}' 
    : __dirname + '/**/*.entity{.ts,.js}';
  const migrationsPath = isProduction
    ? __dirname + '/migrations/*{.js}'
    : __dirname + '/migrations/*{.ts,.js}';

  if (databaseUrl) {
    // Parse DATABASE_URL format: postgresql://user:password@host:port/database
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: [entitiesPath],
      migrations: [migrationsPath],
      synchronize: false, // Never use synchronize in production
      logging: !isProduction,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    };
  }

  // Fallback to individual variables
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'nhl_fantasy',
    password: process.env.DATABASE_PASSWORD || 'nhl_fantasy_password',
    database: process.env.DATABASE_NAME || 'nhl_fantasy',
    entities: [entitiesPath],
    migrations: [migrationsPath],
    synchronize: !isProduction && process.env.NODE_ENV === 'development',
    logging: !isProduction,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  };
};

export const dataSourceOptions: DataSourceOptions = getDataSourceOptions();

export const dataSource = new DataSource(dataSourceOptions);

