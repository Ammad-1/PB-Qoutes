const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/quote/:id', (req, res) => {
  const id = req.params.id;
  req.db.get('SELECT q.*, c.company_name, c.contact_person, c.email, c.phone, c.address FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.id=?', [id], (err, quote) => {
    if (err || !quote) return res.status(404).json({ error: 'Not found' });
        req.db.all(
      `SELECT l.*, p.name as product_name, pm.name as print_method_name, s.supplier_name
       FROM quote_lines l 
       JOIN products p ON p.id=l.product_id
       JOIN print_methods pm ON pm.id=l.print_method_id
       LEFT JOIN suppliers s ON s.id=l.supplier_id
       WHERE l.quote_id=?`,
      [id],
      (err2, lines) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const doc = new PDFDocument({ margin: 40 });
        const outPath = path.join(req.paths.QUOTES_DIR, `${quote.quote_number}.pdf`);
        const stream = fs.createWriteStream(outPath);
        doc.pipe(stream);

        const currency = (n) => `£${Number(n || 0).toFixed(2)}`;

        // Header layout (two columns)
        const pageWidth = doc.page.width;
        const { left, right, top, bottom } = doc.page.margins;
        const contentWidth = pageWidth - left - right;

        doc.fontSize(20).text('Printberry Ltd', left, top);
        doc.fontSize(10).text('Local Quoting System', left, doc.y);

        const headerRightX = left + contentWidth / 2 + 10;
        const headerRightWidth = contentWidth / 2 - 10;
        const headerBoxTop = top;
        doc.fontSize(12).text(`Quote: ${quote.quote_number}`, headerRightX, headerBoxTop, { width: headerRightWidth, align: 'right' });
        doc.text(`Date: ${new Date(quote.date).toLocaleDateString()}`, headerRightX, doc.y, { width: headerRightWidth, align: 'right' });

        // Customer block
        doc.moveDown(1.5);
        const customerTop = doc.y;
        doc.fontSize(12).text('Customer', left, customerTop);
        doc.fontSize(10);
        const customerLines = [quote.company_name, quote.contact_person, quote.email, quote.phone, quote.address].filter(Boolean);
        customerLines.forEach(t => doc.text(t, left, doc.y));

        // Gap
        doc.moveDown(1);

        // Table
        const columns = [
          { key: 'product', header: 'Product', width: quote.hide_supplier_in_pdf ? 280 : 170, align: 'left' },
          ...(quote.hide_supplier_in_pdf ? [] : [{ key: 'supplier', header: 'Supplier', width: 110, align: 'left' }]),
          { key: 'print', header: 'Print', width: 110, align: 'left' },
          { key: 'qty', header: 'Qty', width: 40, align: 'right' },
          { key: 'unit', header: 'Unit', width: 60, align: 'right' },
          { key: 'total', header: 'Total', width: 70, align: 'right' },
        ];

        const table = {
          x: left,
          y: doc.y,
          rowPadV: 6,
          rowPadH: 6,
          lineY: doc.y,
        };

        const drawRowBackground = (y, h, alt) => {
          if (alt) {
            doc.save();
            doc.rect(table.x, y, contentWidth, h).fill('#fafafa');
            doc.restore();
          }
          doc.moveTo(table.x, y).lineTo(table.x + contentWidth, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
        };

        const drawHeader = () => {
          doc.fontSize(11).fillColor('#000');
          let x = table.x;
          let y = table.y;
          const h = 20;
          drawRowBackground(y, h, false);
          columns.forEach(col => {
            doc.font('Helvetica-Bold').text(col.header, x + table.rowPadH, y + table.rowPadV / 2, { width: col.width - table.rowPadH * 2, align: col.align });
            x += col.width;
          });
          doc.moveTo(table.x, y + h).lineTo(table.x + contentWidth, y + h).strokeColor('#cccccc').stroke();
          table.lineY = y + h;
        };

        const ensureSpace = (rowHeightEstimate = 24) => {
          const maxY = doc.page.height - bottom - 120; // leave space for totals
          if (table.lineY + rowHeightEstimate > maxY) {
            doc.addPage();
            table.y = top;
            drawHeader();
          }
        };

        const drawRow = (row, alt) => {
          let x = table.x;
          const cellHeights = [];
          const texts = quote.hide_supplier_in_pdf
            ? [row.product, row.print, String(row.qty), currency(row.unit), currency(row.total)]
            : [row.product, row.supplier, row.print, String(row.qty), currency(row.unit), currency(row.total)];
          columns.forEach((col, idx) => {
            const text = texts[idx];
            const h = doc.heightOfString(text, { width: col.width - table.rowPadH * 2, align: col.align });
            cellHeights.push(h);
          });
          const rowHeight = Math.max(...cellHeights) + table.rowPadV * 2;
          ensureSpace(rowHeight + 10);
          drawRowBackground(table.lineY, rowHeight, alt);
          columns.forEach((col, idx) => {
            const text = texts[idx];
            doc.font('Helvetica').fillColor('#000').text(text, x + table.rowPadH, table.lineY + table.rowPadV, { width: col.width - table.rowPadH * 2, align: col.align });
            x += col.width;
          });
          table.lineY += rowHeight;
        };

        // Render table
        drawHeader();
        lines.forEach((l, i) => {
          const unit = (l.selling_price / Math.max(1, l.quantity)) || 0;
          drawRow(
            quote.hide_supplier_in_pdf
              ? { product: l.manual_product_name || l.product_name, print: l.manual_print_method_name || l.print_method_name, qty: l.quantity, unit, total: l.selling_price }
              : { product: l.manual_product_name || l.product_name, supplier: l.supplier_name || '-', print: l.manual_print_method_name || l.print_method_name, qty: l.quantity, unit, total: l.selling_price },
            i % 2 === 1
          );
          if (l.line_description) {
            // Description line under the row
            const desc = String(l.line_description);
            const x = left + 6;
            const w = contentWidth - 12;
            const h = doc.heightOfString(desc, { width: w });
            ensureSpace(h + 10);
            doc.font('Helvetica').fontSize(9).fillColor('#555').text(desc, x, table.lineY + 2, { width: w });
            table.lineY += h + 8;
          }
        });

        // Totals summary box
        ensureSpace(100);
        const totalsX = left + contentWidth - 220;
        const totalsWidth = 220;
        const line = (label, value, bold = false) => {
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
          doc.text(label, totalsX, table.lineY + 6, { width: totalsWidth / 2, align: 'left' });
          doc.text(value, totalsX + totalsWidth / 2, table.lineY + 6, { width: totalsWidth / 2, align: 'right' });
          table.lineY += 18;
        };
        doc.rect(totalsX, table.lineY, totalsWidth, 70).strokeColor('#cccccc').stroke();
        line('Subtotal', currency(quote.subtotal));
        line('VAT', currency(quote.vat));
        line('Total', currency(quote.total), true);

        // Notes and terms
        const notesStartY = table.lineY + 16;
        if (quote.notes) {
          doc.font('Helvetica-Bold').text('Notes', left, notesStartY);
          doc.font('Helvetica').text(String(quote.notes), left, doc.y, { width: contentWidth / 2 - 10 });
        }
        if (quote.terms) {
          const termsX = left + contentWidth / 2 + 10;
          doc.font('Helvetica-Bold').text('Terms', termsX, notesStartY);
          doc.font('Helvetica').text(String(quote.terms), termsX, doc.y, { width: contentWidth / 2 - 10 });
        }

        doc.end();
        stream.on('finish', () => {
          res.json({ saved: true, path: outPath });
        });
      }
    );
  });
});

module.exports = router;



