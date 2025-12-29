const { DataSource } = require('typeorm');
const config = require('./dist/data-source.js').dataSourceOptions;

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
    process.exit(0);
  });
