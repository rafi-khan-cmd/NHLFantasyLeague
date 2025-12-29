import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

// Support both DATABASE_URL (Railway format) and individual variables
const getDataSourceOptions = (): DataSourceOptions => {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Parse DATABASE_URL format: postgresql://user:password@host:port/database
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
};

export const dataSourceOptions: DataSourceOptions = getDataSourceOptions();

export const dataSource = new DataSource(dataSourceOptions);

