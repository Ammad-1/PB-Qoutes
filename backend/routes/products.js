const express = require('express');
const router = express.Router();
const multer = require('multer');
const Papa = require('papaparse');
const upload = multer({ storage: multer.memoryStorage() });

// List with search/filter
router.get('/', (req, res) => {
  const { q, category } = req.query;
  const clauses = [];
  const params = [];
  if (q) {
    clauses.push('(p.name LIKE ? OR p.sku LIKE ? )');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    clauses.push('p.category = ?');
    params.push(category);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT p.*, (
      SELECT json_group_array(json_object(
        'id', s.id,
        'supplier_name', s.supplier_name,
        'unit_cost', s.unit_cost,
        'moq', s.moq,
        'bulk_price', s.bulk_price
      )) FROM suppliers s WHERE s.product_id = p.id
    ) AS suppliers
    FROM products p
    ${where}
    ORDER BY p.id DESC
  `;
  req.db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const mapped = rows.map(r => ({ ...r, suppliers: r.suppliers ? JSON.parse(r.suppliers) : [] }));
    res.json(mapped);
  });
});

router.post('/', (req, res) => {
  const { name, category, sku, suppliers } = req.body;
  req.db.run('INSERT INTO products (name, category, sku) VALUES (?,?,?)', [name, category, sku], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const productId = this.lastID;
    if (Array.isArray(suppliers) && suppliers.length) {
      const stmt = req.db.prepare('INSERT INTO suppliers (product_id, supplier_name, unit_cost, moq, bulk_price) VALUES (?,?,?,?,?)');
      suppliers.forEach(s => stmt.run([productId, s.supplier_name, s.unit_cost, s.moq || 1, s.bulk_price]));
      stmt.finalize(() => res.json({ id: productId }));
    } else {
      res.json({ id: productId });
    }
  });
});

router.put('/:id', (req, res) => {
  const { name, category, sku, suppliers } = req.body;
  const { id } = req.params;
  req.db.run('UPDATE products SET name=?, category=?, sku=? WHERE id=?', [name, category, sku, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    // Replace suppliers
    req.db.run('DELETE FROM suppliers WHERE product_id=?', [id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (Array.isArray(suppliers) && suppliers.length) {
        const stmt = req.db.prepare('INSERT INTO suppliers (product_id, supplier_name, unit_cost, moq, bulk_price) VALUES (?,?,?,?,?)');
        suppliers.forEach(s => stmt.run([id, s.supplier_name, s.unit_cost, s.moq || 1, s.bulk_price]));
        stmt.finalize(() => res.json({ updated: true }));
      } else {
        res.json({ updated: true });
      }
    });
  });
});

router.delete('/:id', (req, res) => {
  req.db.run('DELETE FROM products WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes > 0 });
  });
});

router.delete('/', (req, res) => {
  // Danger: delete all products and suppliers
  req.db.serialize(() => {
    req.db.run('DELETE FROM suppliers');
    req.db.run('DELETE FROM products', [], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: true });
    });
  });
});

module.exports = router;

// Bulk import CSV: columns -> name,category,sku,supplier_name,unit_cost,moq,bulk_price
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const csv = req.file.buffer.toString('utf-8');
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const rows = parsed.data;

  const getProductId = (row) => new Promise((resolve, reject) => {
    req.db.get('SELECT id FROM products WHERE name=? AND IFNULL(sku, "") = IFNULL(?, "")', [row.name, row.sku || null], (err, found) => {
      if (err) return reject(err);
      if (found) return resolve(found.id);
      req.db.run('INSERT INTO products (name, category, sku) VALUES (?,?,?)', [row.name, row.category || null, row.sku || null], function (err2) {
        if (err2) return reject(err2);
        resolve(this.lastID);
      });
    });
  });

  (async () => {
    for (const r of rows) {
      if (!r.name) continue;
      const pid = await getProductId(r);
      if (r.supplier_name) {
        await new Promise((resolve, reject) => {
          req.db.run(
            'INSERT INTO suppliers (product_id, supplier_name, unit_cost, moq, bulk_price) VALUES (?,?,?,?,?)',
            [pid, r.supplier_name, Number(r.unit_cost || 0), parseInt(r.moq || 1), r.bulk_price === '' || r.bulk_price == null ? null : Number(r.bulk_price)],
            (err) => (err ? reject(err) : resolve())
          );
        });
      }
    }
    res.json({ imported: rows.length });
  })().catch((e) => res.status(500).json({ error: e.message }));
});


