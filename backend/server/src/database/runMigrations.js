/**
 * ADMA — Script d'exécution des migrations et seeds
 * Compatible TiDB Cloud Serverless & MySQL local/distant
 * Usage :
 *   npm run db:import           (exécute les migrations et seeds)
 *   node src/database/runMigrations.js --only-migrations
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../database/migrations');
const SEEDS_DIR      = path.resolve(__dirname, '../../../database/seeds');

async function run() {
  console.log('──────────────────────────────────────────────────────');
  console.log('🚀 ADMA Database Migration Runner');
  console.log(`📡 Cible : ${config.db.host}:${config.db.port} [BD: ${config.db.name}]`);
  console.log(`🔒 SSL : ${config.db.ssl ? 'Activé' : 'Désactivé'}`);
  console.log('──────────────────────────────────────────────────────');

  const sslConfig = config.db.ssl
    ? {
        ssl: {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          minVersion: 'TLSv1.2',
        },
      }
    : {};

  const connection = await mysql.createConnection({
    host:               config.db.host,
    port:               config.db.port,
    user:               config.db.user,
    password:           config.db.password,
    database:           config.db.name,
    multipleStatements: true,
    charset:            'utf8mb4',
    ...sslConfig,
  });

  try {
    // ── 1. Exécution des migrations ─────────────────────────────────
    console.log('\n📦 Application des migrations...');
    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      console.log(`  ▶ Exécution de : ${file}`);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await connection.query(sql);
      console.log(`  ✔ Migration réussie : ${file}`);
    }

    // ── 2. Exécution des seeds ──────────────────────────────────────
    const onlyMigrations = process.argv.includes('--only-migrations');
    if (!onlyMigrations && fs.existsSync(SEEDS_DIR)) {
      console.log('\n🌱 Application des seeds de démarrage...');
      const seedFiles = fs
        .readdirSync(SEEDS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const file of seedFiles) {
        const filePath = path.join(SEEDS_DIR, file);
        console.log(`  ▶ Exécution de : ${file}`);
        const sql = fs.readFileSync(filePath, 'utf-8');
        await connection.query(sql);
        console.log(`  ✔ Données insérées : ${file}`);
      }
    }

    console.log('\n✨ Toutes les migrations et données de base ont été appliquées avec succès !');
  } catch (err) {
    console.error('\n❌ Erreur lors de l’exécution des migrations :', err.message);
    if (err.sql) console.error('SQL en cause :', err.sql.slice(0, 300));
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
