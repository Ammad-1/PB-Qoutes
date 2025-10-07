const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const { q } = req.query;
  const where = q ? 'WHERE company_name LIKE ? OR contact_person LIKE ? OR email LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  req.db.all(`SELECT * FROM customers ${where} ORDER BY id DESC`, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { company_name, contact_person, email, phone, address } = req.body;
  req.db.run(
    'INSERT INTO customers (company_name, contact_person, email, phone, address) VALUES (?,?,?,?,?)',
    [company_name, contact_person, email, phone, address],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/:id', (req, res) => {
  const { company_name, contact_person, email, phone, address } = req.body;
  req.db.run(
    'UPDATE customers SET company_name=?, contact_person=?, email=?, phone=?, address=? WHERE id=?',
    [company_name, contact_person, email, phone, address, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes > 0 });
    }
  );
});

router.delete('/:id', (req, res) => {
  req.db.run('DELETE FROM customers WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes > 0 });
  });
});

router.delete('/', (req, res) => {
  req.db.run('DELETE FROM customers', [], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: true });
  });
});

module.exports = router;



