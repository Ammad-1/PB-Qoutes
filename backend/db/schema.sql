PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  vat_percent REAL NOT NULL DEFAULT 20.0,
  default_markup_percent REAL NOT NULL DEFAULT 30.0,
  quote_prefix TEXT NOT NULL DEFAULT 'PB'
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  sku TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  supplier_name TEXT NOT NULL,
  unit_cost REAL NOT NULL,
  moq INTEGER DEFAULT 1,
  bulk_price REAL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS print_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  per_colour_cost REAL DEFAULT 0,
  per_unit_cost REAL DEFAULT 0,
  setup_fee REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS print_method_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  print_method_id INTEGER NOT NULL,
  min_qty INTEGER NOT NULL,
  per_unit_cost REAL,
  per_colour_cost REAL,
  FOREIGN KEY (print_method_id) REFERENCES print_methods(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  subtotal REAL NOT NULL DEFAULT 0,
  vat REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  markup_percent REAL,
  vat_percent REAL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS quote_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  supplier_id INTEGER,
  print_method_id INTEGER NOT NULL,
  colours INTEGER DEFAULT 0,
  quantity INTEGER NOT NULL,
  product_unit_cost REAL NOT NULL,
  print_cost_total REAL NOT NULL,
  line_total_cost REAL NOT NULL,
  selling_price REAL NOT NULL,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (print_method_id) REFERENCES print_methods(id)
);

-- seed defaults
INSERT OR IGNORE INTO settings (id, vat_percent, default_markup_percent, quote_prefix)
VALUES (1, 20.0, 30.0, 'PB');



