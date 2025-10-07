const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const Papa = require('papaparse');
const xlsx = require('node-xlsx');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 5001);
const DB_PATH = path.join(__dirname, 'db', 'printberry.sqlite');
const QUOTES_DIR = path.join(__dirname, '..', 'Quotes');

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
if (!fs.existsSync(QUOTES_DIR)) {
  fs.mkdirSync(QUOTES_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

const db = new sqlite3.Database(DB_PATH);

// Initialize DB schema if not exists, then run migrations, then start server
const schemaSql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf-8');

function addColumnIfMissing(dbConn, table, column, type) {
  return new Promise((resolve) => {
    dbConn.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
      if (err) return resolve();
      const exists = rows.some(r => r.name === column);
      if (!exists) {
        dbConn.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, [], () => resolve());
      } else {
        resolve();
      }
    });
  });
}

async function migrateAndStart() {
  await new Promise((res) => db.exec(schemaSql, () => res()));

  const tasks = [
    addColumnIfMissing(db, 'quote_lines', 'pricing_mode', 'TEXT DEFAULT "auto"'),
    addColumnIfMissing(db, 'quote_lines', 'manual_unit_price', 'REAL'),
    addColumnIfMissing(db, 'quote_lines', 'manual_total', 'REAL'),
    addColumnIfMissing(db, 'quote_lines', 'line_description', 'TEXT'),
    addColumnIfMissing(db, 'quote_lines', 'manual_product_name', 'TEXT'),
    addColumnIfMissing(db, 'quote_lines', 'manual_print_method_name', 'TEXT'),
    addColumnIfMissing(db, 'quote_lines', 'pack_size', 'INTEGER'),
    addColumnIfMissing(db, 'quote_lines', 'delivery_per_pack', 'REAL'),
    addColumnIfMissing(db, 'quote_lines', 'delivery_flat', 'REAL'),
    addColumnIfMissing(db, 'quotes', 'hide_supplier_in_pdf', 'INTEGER DEFAULT 1'),
    addColumnIfMissing(db, 'settings', 'default_pricing_mode', 'TEXT DEFAULT "auto"'),
    addColumnIfMissing(db, 'settings', 'default_hide_supplier', 'INTEGER DEFAULT 1'),
    addColumnIfMissing(db, 'settings', 'default_pack_size', 'INTEGER'),
    addColumnIfMissing(db, 'settings', 'default_delivery_per_pack', 'REAL'),
    addColumnIfMissing(db, 'settings', 'default_delivery_flat', 'REAL'),
  ];
  await Promise.all(tasks);

  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

// Attach db and helpers to request
app.use((req, res, next) => {
  req.db = db;
  req.paths = { DB_PATH, QUOTES_DIR };
  next();
});

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/print-methods', require('./routes/printMethods'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api/settings', require('./routes/settings'));

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Serve static files from frontend build in production
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('/*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Start after migrations complete
migrateAndStart();


