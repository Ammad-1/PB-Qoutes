const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const xlsx = require('node-xlsx');
const router = express.Router();

function getSettings(db) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM settings WHERE id=1', [], (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function generateQuoteNumber(prefix, nowIso, db) {
  return new Promise((resolve, reject) => {
    const year = new Date(nowIso).getFullYear();
    const like = `${prefix}-${year}-%`;
    db.get('SELECT COUNT(*) as c FROM quotes WHERE quote_number LIKE ?', [like], (err, row) => {
      if (err) return reject(err);
      const next = (row.c || 0) + 1;
      const seq = String(next).padStart(3, '0');
      resolve(`${prefix}-${year}-${seq}`);
    });
  });
}

function calcLineTotals(line, printMethod) {
  const quantity = Number(line.quantity);
  const colours = Number(line.colours || 0);
  const unitCost = Number(line.product_unit_cost);
  const perColour = Number(printMethod.per_colour_cost || 0);
  const perUnit = Number(printMethod.per_unit_cost || 0);

  let printCostTotal = 0;
  if (perColour > 0 && colours > 0) {
    printCostTotal = perColour * colours * quantity;
  } else {
    printCostTotal = perUnit * quantity;
  }
  const lineTotalCost = (unitCost + (printCostTotal / quantity)) * quantity;
  return { printCostTotal, lineTotalCost };
}

router.get('/', (req, res) => {
  const { q, status, customer_id, from, to } = req.query;
  const clauses = [];
  const params = [];
  if (q) {
    clauses.push('(quote_number LIKE ? OR c.company_name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (status) { clauses.push('q.status = ?'); params.push(status); }
  if (customer_id) { clauses.push('q.customer_id = ?'); params.push(customer_id); }
  if (from) { clauses.push('q.date >= ?'); params.push(from); }
  if (to) { clauses.push('q.date <= ?'); params.push(to); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT q.*, c.company_name FROM quotes q JOIN customers c ON c.id=q.customer_id ${where} ORDER BY q.id DESC`;
  req.db.all(sql, params, (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows));
});

router.get('/:id', (req, res) => {
  const id = req.params.id;
  req.db.get('SELECT * FROM quotes WHERE id=?', [id], (err, quote) => {
    if (err || !quote) return res.status(404).json({ error: 'Not found' });
    req.db.all('SELECT * FROM quote_lines WHERE quote_id=?', [id], (err2, lines) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ...quote, lines });
    });
  });
});

router.post('/clone/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const settings = await getSettings(req.db);
    const now = new Date().toISOString();
    const newQuoteNumber = await generateQuoteNumber(settings.quote_prefix || 'PB', now, req.db);
    req.db.get('SELECT * FROM quotes WHERE id=?', [id], (err, qrow) => {
      if (err || !qrow) return res.status(404).json({ error: 'Not found' });
      req.db.run(
        'INSERT INTO quotes (quote_number, customer_id, date, status, subtotal, vat, total, notes, terms, markup_percent, vat_percent) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [newQuoteNumber, qrow.customer_id, now, 'Pending', qrow.subtotal, qrow.vat, qrow.total, qrow.notes, qrow.terms, qrow.markup_percent, qrow.vat_percent],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          const newId = this.lastID;
          req.db.all('SELECT * FROM quote_lines WHERE quote_id=?', [id], (err3, lines) => {
            if (err3) return res.status(500).json({ error: err3.message });
            const stmt = req.db.prepare(
              'INSERT INTO quote_lines (quote_id, product_id, supplier_id, print_method_id, colours, quantity, product_unit_cost, print_cost_total, line_total_cost, selling_price) VALUES (?,?,?,?,?,?,?,?,?,?)'
            );
            lines.forEach(l => stmt.run([newId, l.product_id, l.supplier_id, l.print_method_id, l.colours, l.quantity, l.product_unit_cost, l.print_cost_total, l.line_total_cost, l.selling_price]));
            stmt.finalize(() => res.json({ id: newId, quote_number: newQuoteNumber }));
          });
        }
      );
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_id, lines = [], notes = '', terms = '', markup_percent, vat_percent, hide_supplier_in_pdf } = req.body;
    if (!customer_id) {
      return res.status(400).json({ error: 'Customer is required' });
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required' });
    }
    for (const [index, line] of lines.entries()) {
      if (!line || (!line.product_id && !line.manual_product_name)) return res.status(400).json({ error: `Line ${index + 1}: Product is required` });
      if (!line.print_method_id && !line.manual_print_method_name) return res.status(400).json({ error: `Line ${index + 1}: Print method is required` });
      if (!line.quantity || Number(line.quantity) <= 0) return res.status(400).json({ error: `Line ${index + 1}: Quantity must be greater than 0` });
      if (line.pricing_mode === 'manual_total') {
        if (typeof line.manual_total === 'undefined' || isNaN(Number(line.manual_total))) return res.status(400).json({ error: `Line ${index + 1}: Manual total must be provided` });
      } else if (line.pricing_mode === 'manual_unit') {
        if (typeof line.manual_unit_price === 'undefined' || isNaN(Number(line.manual_unit_price))) return res.status(400).json({ error: `Line ${index + 1}: Manual unit price required` });
      } else {
        if (typeof line.product_unit_cost === 'undefined' || isNaN(Number(line.product_unit_cost))) return res.status(400).json({ error: `Line ${index + 1}: Unit cost must be provided` });
      }
    }
    const settings = await getSettings(req.db);
    const now = new Date().toISOString();
    const quote_number = await generateQuoteNumber(settings.quote_prefix || 'PB', now, req.db);

    // compute totals (support manual pricing per line)
    const effectiveMarkup = isNaN(Number(markup_percent)) ? settings.default_markup_percent : Number(markup_percent);
    const effectiveVat = isNaN(Number(vat_percent)) ? settings.vat_percent : Number(vat_percent);
    const lineWrites = [];
    let sellingSubtotal = 0;
    for (const line of lines) {
      const pm = line.print_method_id ? await new Promise((resolve, reject) => {
        req.db.get('SELECT * FROM print_methods WHERE id=?', [line.print_method_id], (err, row) => err ? reject(err) : resolve(row));
      }) : null;
      if (!pm && !line.manual_print_method_name) return res.status(400).json({ error: 'Invalid print method selected' });

      const pricingMode = ['manual_unit', 'manual_total'].includes(line.pricing_mode) ? line.pricing_mode : 'auto';
      let printCostTotal = 0;
      let lineTotalCost = 0;
      let lineSellingTotal = 0;

      if (pricingMode === 'auto') {
        const computed = calcLineTotals(line, pm);
        printCostTotal = computed.printCostTotal;
        lineTotalCost = computed.lineTotalCost;
        lineSellingTotal = lineTotalCost * (1 + (effectiveMarkup / 100));
      } else if (pricingMode === 'manual_unit') {
        const qty = Number(line.quantity || 0);
        const unit = Number(line.manual_unit_price || 0);
        const packSize = Number(line.pack_size || 0);
        const perPack = Number(line.delivery_per_pack || 0);
        const flat = Number(line.delivery_flat || 0);
        const boxes = packSize > 0 ? Math.ceil(qty / packSize) : 0;
        const delivery = (boxes * perPack) + flat;
        lineSellingTotal = (unit * qty) + delivery;
        lineTotalCost = Number(line.product_unit_cost || 0) * qty; // informational
        printCostTotal = 0; // ignored in manual
      } else if (pricingMode === 'manual_total') {
        lineSellingTotal = Number(line.manual_total || 0);
        lineTotalCost = 0;
        printCostTotal = 0;
      }

      sellingSubtotal += lineSellingTotal;
      lineWrites.push({ ...line, pricing_mode: pricingMode, print_cost_total: printCostTotal, line_total_cost: lineTotalCost, selling_total: lineSellingTotal });
    }
    const vat = sellingSubtotal * (effectiveVat / 100);
    const total = sellingSubtotal + vat;

    req.db.run(
      'INSERT INTO quotes (quote_number, customer_id, date, status, subtotal, vat, total, notes, terms, markup_percent, vat_percent, hide_supplier_in_pdf) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [quote_number, customer_id, now, 'Pending', sellingSubtotal, vat, total, notes, terms, effectiveMarkup, effectiveVat, hide_supplier_in_pdf ? 1 : 0],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const qid = this.lastID;
        const stmt = req.db.prepare(
          'INSERT INTO quote_lines (quote_id, product_id, supplier_id, print_method_id, colours, quantity, product_unit_cost, print_cost_total, line_total_cost, selling_price, pricing_mode, manual_unit_price, pack_size, delivery_per_pack, delivery_flat, manual_total, line_description, manual_product_name, manual_print_method_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        lineWrites.forEach(l => {
          stmt.run([
            qid,
            l.product_id,
            l.supplier_id || null,
            l.print_method_id,
            l.colours || 0,
            l.quantity,
            isNaN(Number(l.product_unit_cost)) ? 0 : Number(l.product_unit_cost),
            l.print_cost_total,
            l.line_total_cost,
            l.selling_total,
            l.pricing_mode || 'auto',
            (l.manual_unit_price === '' || typeof l.manual_unit_price === 'undefined') ? null : Number(l.manual_unit_price),
            (l.pack_size === '' || typeof l.pack_size === 'undefined') ? null : Number(l.pack_size),
            (l.delivery_per_pack === '' || typeof l.delivery_per_pack === 'undefined') ? null : Number(l.delivery_per_pack),
            (l.delivery_flat === '' || typeof l.delivery_flat === 'undefined') ? null : Number(l.delivery_flat),
            (l.manual_total === '' || typeof l.manual_total === 'undefined') ? null : Number(l.manual_total),
            (l.line_description === '' || typeof l.line_description === 'undefined') ? null : String(l.line_description),
            (l.manual_product_name === '' || typeof l.manual_product_name === 'undefined') ? null : String(l.manual_product_name),
            (l.manual_print_method_name === '' || typeof l.manual_print_method_name === 'undefined') ? null : String(l.manual_print_method_name),
          ]);
        });
        stmt.finalize(() => res.json({ id: qid, quote_number }));
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  const { status, notes, terms } = req.body;
  req.db.run('UPDATE quotes SET status=COALESCE(?, status), notes=COALESCE(?, notes), terms=COALESCE(?, terms) WHERE id=?', [status, notes, terms, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes > 0 });
  });
});

router.delete('/:id', (req, res) => {
  // Cascade will remove quote_lines due to FK with ON DELETE CASCADE
  req.db.run('DELETE FROM quotes WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes > 0 });
  });
});

router.get('/export/csv', (req, res) => {
  const rows = [];
  req.db.each(
    'SELECT q.quote_number, q.date, q.status, q.subtotal, q.vat, q.total, c.company_name FROM quotes q JOIN customers c ON c.id=q.customer_id ORDER BY q.id DESC',
    [],
    (err, row) => { if (!err) rows.push(row); },
    () => {
      const header = Object.keys(rows[0] || { quote_number: '', date: '', status: '', subtotal: '', vat: '', total: '', company_name: '' });
      const csv = [header.join(','), ...rows.map(r => header.map(h => r[h]).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="quotes.csv"');
      res.send(csv);
    }
  );
});

router.get('/export/xlsx', (req, res) => {
  const rows = [];
  req.db.each(
    'SELECT q.quote_number, q.date, q.status, q.subtotal, q.vat, q.total, c.company_name FROM quotes q JOIN customers c ON c.id=q.customer_id ORDER BY q.id DESC',
    [],
    (err, row) => { if (!err) rows.push(row); },
    () => {
      const header = Object.keys(rows[0] || { quote_number: '', date: '', status: '', subtotal: '', vat: '', total: '', company_name: '' });
      const data = [header, ...rows.map(r => header.map(h => r[h]))];
      const buffer = xlsx.build([{ name: 'Quotes', data }]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="quotes.xlsx"');
      res.send(Buffer.from(buffer));
    }
  );
});

module.exports = router;


