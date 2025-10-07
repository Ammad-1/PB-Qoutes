const express = require('express');
const router = express.Router();
const multer = require('multer');
const Papa = require('papaparse');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', (req, res) => {
  req.db.all(
    `SELECT pm.*, (
      SELECT json_group_array(json_object('id', t.id, 'min_qty', t.min_qty, 'per_unit_cost', t.per_unit_cost, 'per_colour_cost', t.per_colour_cost))
      FROM print_method_tiers t WHERE t.print_method_id = pm.id
    ) AS tiers FROM print_methods pm ORDER BY id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const out = rows.map(r => ({ ...r, tiers: r.tiers ? JSON.parse(r.tiers) : [] }));
      res.json(out);
    }
  );
});

router.post('/', (req, res) => {
  const { name, per_colour_cost = 0, per_unit_cost = 0, setup_fee = 0, tiers = [] } = req.body;
  req.db.run(
    'INSERT INTO print_methods (name, per_colour_cost, per_unit_cost, setup_fee) VALUES (?,?,?,?)',
    [name, per_colour_cost, per_unit_cost, setup_fee],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const id = this.lastID;
      if (Array.isArray(tiers) && tiers.length) {
        const stmt = req.db.prepare('INSERT INTO print_method_tiers (print_method_id, min_qty, per_unit_cost, per_colour_cost) VALUES (?,?,?,?)');
        tiers.forEach(t => stmt.run([id, t.min_qty, t.per_unit_cost, t.per_colour_cost]));
        stmt.finalize(() => res.json({ id }));
      } else {
        res.json({ id });
      }
    }
  );
});

router.put('/:id', (req, res) => {
  const { name, per_colour_cost = 0, per_unit_cost = 0, setup_fee = 0, tiers = [] } = req.body;
  const { id } = req.params;
  req.db.run(
    'UPDATE print_methods SET name=?, per_colour_cost=?, per_unit_cost=?, setup_fee=? WHERE id=?',
    [name, per_colour_cost, per_unit_cost, setup_fee, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      req.db.run('DELETE FROM print_method_tiers WHERE print_method_id=?', [id], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (Array.isArray(tiers) && tiers.length) {
          const stmt = req.db.prepare('INSERT INTO print_method_tiers (print_method_id, min_qty, per_unit_cost, per_colour_cost) VALUES (?,?,?,?)');
          tiers.forEach(t => stmt.run([id, t.min_qty, t.per_unit_cost, t.per_colour_cost]));
          stmt.finalize(() => res.json({ updated: true }));
        } else {
          res.json({ updated: true });
        }
      });
    }
  );
});

router.delete('/:id', (req, res) => {
  req.db.run('DELETE FROM print_methods WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes > 0 });
  });
});

router.delete('/', (req, res) => {
  req.db.serialize(() => {
    req.db.run('DELETE FROM print_method_tiers');
    req.db.run('DELETE FROM print_methods', [], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: true });
    });
  });
});

module.exports = router;

// Bulk import CSV: columns -> name,per_colour_cost,per_unit_cost,setup_fee
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const csv = req.file.buffer.toString('utf-8');
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const rows = parsed.data;

  (async () => {
    for (const r of rows) {
      if (!r.name) continue;
      await new Promise((resolve, reject) => {
        req.db.run(
          'INSERT INTO print_methods (name, per_colour_cost, per_unit_cost, setup_fee) VALUES (?,?,?,?)',
          [r.name, Number(r.per_colour_cost || 0), Number(r.per_unit_cost || 0), Number(r.setup_fee || 0)],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }
    res.json({ imported: rows.length });
  })().catch((e) => res.status(500).json({ error: e.message }));
});


