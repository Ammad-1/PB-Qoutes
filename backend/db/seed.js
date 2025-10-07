const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'printberry.sqlite');

function runMigrations(db) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const fs = require('fs');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

async function seed() {
  const db = new sqlite3.Database(DB_PATH);
  await runMigrations(db);

  const run = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function (err) { err ? rej(err) : res(this); }));

  // Keep only settings; no seed customers/products/print methods in clean start

  console.log('Seed complete');
  db.close();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});



