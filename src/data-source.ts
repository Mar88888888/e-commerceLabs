import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

const getDataSourceOptions = (): DataSourceOptions => {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    };
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const username = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !port || !username || !password || !database) {
    throw new Error(
      'Database configuration missing. Set DATABASE_URL or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME',
    );
  }

  return {
    type: 'postgres',
    host,
    port: parseInt(port, 10),
    username,
    password,
    database,
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
  };
};

export const dataSourceOptions = getDataSourceOptions();

export default new DataSource(dataSourceOptions);
