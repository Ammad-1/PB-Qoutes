const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  req.db.get('SELECT * FROM settings WHERE id=1', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

router.put('/', (req, res) => {
  const { vat_percent, default_markup_percent, quote_prefix, default_pricing_mode, default_hide_supplier, default_pack_size, default_delivery_per_pack, default_delivery_flat } = req.body;
  req.db.run(
    'UPDATE settings SET vat_percent=COALESCE(?, vat_percent), default_markup_percent=COALESCE(?, default_markup_percent), quote_prefix=COALESCE(?, quote_prefix), default_pricing_mode=COALESCE(?, default_pricing_mode), default_hide_supplier=COALESCE(?, default_hide_supplier), default_pack_size=COALESCE(?, default_pack_size), default_delivery_per_pack=COALESCE(?, default_delivery_per_pack), default_delivery_flat=COALESCE(?, default_delivery_flat) WHERE id=1',
    [vat_percent, default_markup_percent, quote_prefix, default_pricing_mode, default_hide_supplier, default_pack_size, default_delivery_per_pack, default_delivery_flat],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes > 0 });
    }
  );
});

module.exports = router;



