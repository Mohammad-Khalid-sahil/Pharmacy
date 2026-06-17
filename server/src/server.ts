import { Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './config';
import seedSuperAdmin from './utils/seedSuperAdmin';
import './db/registerModels';

let server: Server;

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    await seedSuperAdmin();

    server = app.listen(config.port, () => {
      console.log(`app is listening on port ${config.port}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err instanceof Error ? err.message : err);
    if (config.database_url?.includes('127.0.0.1')) {
      console.error(
        'MongoDB connection refused. Make sure MongoDB is installed and running at 127.0.0.1:27017, or update DATABASE_URL in .env.'
      );
    }
    process.exit(1);
  }
}

main();

process.on('unhandledRejection', (err) => {
  console.log(`😈 unahandledRejection is detected , shutting down ...`, err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

process.on('uncaughtException', () => {
  console.log(`😈 uncaughtException is detected , shutting down ...`);
  process.exit(1);
});
