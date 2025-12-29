const { DataSource } = require('typeorm');
const path = require('path');

// Get the data source options
const databaseUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

const entitiesPath = isProduction 
  ? path.join(__dirname, 'dist', '**', '*.entity.js')
  : path.join(__dirname, 'src', '**', '*.entity.{ts,js}');
const migrationsPath = isProduction
  ? path.join(__dirname, 'dist', 'migrations', '*.js')
  : path.join(__dirname, 'src', 'migrations', '*.{ts,js}');

const config = {
  type: 'postgres',
  url: databaseUrl,
  entities: [entitiesPath],
  migrations: [migrationsPath],
  synchronize: false,
  logging: !isProduction,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
};

const dataSource = new DataSource(config);

dataSource.initialize()
  .then(() => {
    console.log('✅ Database connected');
    return dataSource.runMigrations();
  })
  .then(() => {
    console.log('✅ Migrations completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('⚠️  Migration error:', err.message);
    console.error(err);
    process.exit(0);
  });
