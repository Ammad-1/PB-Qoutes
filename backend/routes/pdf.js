const express = require('express');
const PDFDocument = require('pdfkit');
const router = express.Router();

router.get('/quote/:id/download', (req, res) => {
  const id = req.params.id;
  req.db.get('SELECT q.*, c.company_name, c.contact_person, c.email, c.phone, c.address FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.id=?', [id], (err, quote) => {
    if (err || !quote) return res.status(404).json({ error: 'Not found' });
    
    req.db.all(
      `SELECT l.*, p.name as product_name, pm.name as print_method_name, s.supplier_name
       FROM quote_lines l 
       LEFT JOIN products p ON p.id=l.product_id
       LEFT JOIN print_methods pm ON pm.id=l.print_method_id
       LEFT JOIN suppliers s ON s.id=l.supplier_id
       WHERE l.quote_id=?`,
      [id],
      (err2, lines) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${quote.quote_number}.pdf"`);
        doc.pipe(res);

        const currency = (n) => `£${Number(n || 0).toFixed(2)}`;
        const primaryColor = '#2563eb';
        const textGray = '#374151';
        const lightGray = '#f3f4f6';
        
        const pageWidth = doc.page.width;
        const { left, right, top } = doc.page.margins;
        const contentWidth = pageWidth - left - right;

        doc.fontSize(28)
           .fillColor(primaryColor)
           .text('PRINTBERRY LTD', left, top, { align: 'left' });
        
        doc.fontSize(10)
           .fillColor(textGray)
           .text('Professional Printing Services', left, doc.y + 5);

        const headerY = top;
        doc.fontSize(12)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('QUOTATION', left + contentWidth - 150, headerY, { width: 150, align: 'right' });
        
        doc.fontSize(10)
           .fillColor(textGray)
           .font('Helvetica')
           .text(quote.quote_number, left + contentWidth - 150, doc.y + 2, { width: 150, align: 'right' })
           .text(new Date(quote.date).toLocaleDateString('en-GB'), left + contentWidth - 150, doc.y + 2, { width: 150, align: 'right' });

        doc.moveDown(2);
        
        const dividerY = doc.y;
        doc.rect(left, dividerY, contentWidth, 2)
           .fill(primaryColor);
        
        doc.moveDown(1.5);

        doc.fontSize(11)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('BILL TO', left, doc.y);
        
        doc.fontSize(10)
           .fillColor(textGray)
           .font('Helvetica');
        
        const customerInfo = [
          quote.company_name,
          quote.contact_person,
          quote.email,
          quote.phone,
          quote.address
        ].filter(Boolean);
        
        customerInfo.forEach(info => {
          doc.text(info, left, doc.y + 3);
        });

        doc.moveDown(2);

        const tableTop = doc.y;
        const rowHeight = 35;
        const headerHeight = 30;

        doc.rect(left, tableTop, contentWidth, headerHeight)
           .fill(primaryColor);

        doc.fillColor('#ffffff')
           .font('Helvetica-Bold')
           .fontSize(10);

        const colWidths = {
          description: contentWidth * 0.45,
          quantity: contentWidth * 0.15,
          unitPrice: contentWidth * 0.20,
          total: contentWidth * 0.20
        };

        let xPos = left + 10;
        doc.text('Description', xPos, tableTop + 10, { width: colWidths.description });
        xPos += colWidths.description;
        doc.text('Quantity', xPos, tableTop + 10, { width: colWidths.quantity, align: 'center' });
        xPos += colWidths.quantity;
        doc.text('Unit Price', xPos, tableTop + 10, { width: colWidths.unitPrice, align: 'right' });
        xPos += colWidths.unitPrice;
        doc.text('Total', xPos, tableTop + 10, { width: colWidths.total - 10, align: 'right' });

        let currentY = tableTop + headerHeight;

        lines.forEach((line, index) => {
          const isEven = index % 2 === 0;
          
          if (isEven) {
            doc.rect(left, currentY, contentWidth, rowHeight)
               .fill(lightGray);
          }

          doc.fillColor(textGray)
             .font('Helvetica')
             .fontSize(10);

          const productName = line.manual_product_name || line.product_name;
          const printMethod = line.manual_print_method_name || line.print_method_name;
          const description = `${productName}\n${printMethod}`;
          const unitPrice = (line.selling_price / Math.max(1, line.quantity)) || 0;

          xPos = left + 10;
          
          doc.text(description, xPos, currentY + 8, { 
            width: colWidths.description - 10, 
            height: rowHeight - 16 
          });
          
          xPos += colWidths.description;
          doc.text(String(line.quantity), xPos, currentY + 12, { 
            width: colWidths.quantity, 
            align: 'center' 
          });
          
          xPos += colWidths.quantity;
          doc.text(currency(unitPrice), xPos, currentY + 12, { 
            width: colWidths.unitPrice, 
            align: 'right' 
          });
          
          xPos += colWidths.unitPrice;
          doc.text(currency(line.selling_price), xPos, currentY + 12, { 
            width: colWidths.total - 10, 
            align: 'right' 
          });

          currentY += rowHeight;

          if (line.line_description) {
            const descHeight = 25;
            doc.fontSize(9)
               .fillColor('#6b7280')
               .text(line.line_description, left + 10, currentY + 5, {
                 width: contentWidth - 20
               });
            currentY += descHeight;
          }
        });

        doc.rect(left, currentY, contentWidth, 1)
           .fill('#d1d5db');
        
        currentY += 20;

        const totalsX = left + contentWidth - 220;
        const totalsWidth = 220;

        const drawTotalLine = (label, value, isBold = false) => {
          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
             .fontSize(isBold ? 11 : 10)
             .fillColor(textGray);
          
          doc.text(label, totalsX, currentY, { width: 110, align: 'left' });
          doc.text(value, totalsX + 110, currentY, { width: 110, align: 'right' });
          currentY += 20;
        };

        drawTotalLine('Subtotal:', currency(quote.subtotal));
        drawTotalLine(`VAT (${quote.vat_percent || 20}%):`, currency(quote.vat));
        
        doc.rect(totalsX, currentY - 5, totalsWidth, 1)
           .fill('#d1d5db');
        
        currentY += 5;
        drawTotalLine('TOTAL:', currency(quote.total), true);

        currentY += 30;

        if (quote.notes || quote.terms) {
          doc.rect(left, currentY, contentWidth, 1)
             .fill('#e5e7eb');
          currentY += 20;
        }

        if (quote.notes) {
          doc.fontSize(11)
             .fillColor(primaryColor)
             .font('Helvetica-Bold')
             .text('Notes', left, currentY);
          
          doc.fontSize(10)
             .fillColor(textGray)
             .font('Helvetica')
             .text(quote.notes, left, currentY + 20, { 
               width: contentWidth * 0.48,
               align: 'left'
             });
        }

        if (quote.terms) {
          const termsX = quote.notes ? left + contentWidth * 0.52 : left;
          const termsY = quote.notes ? currentY : currentY;
          
          doc.fontSize(11)
             .fillColor(primaryColor)
             .font('Helvetica-Bold')
             .text('Terms & Conditions', termsX, termsY);
          
          doc.fontSize(10)
             .fillColor(textGray)
             .font('Helvetica')
             .text(quote.terms, termsX, termsY + 20, { 
               width: contentWidth * 0.48,
               align: 'left'
             });
        }

        const footerY = doc.page.height - 50;
        doc.fontSize(9)
           .fillColor('#9ca3af')
           .text(
             'Thank you for your business!',
             left,
             footerY,
             { width: contentWidth, align: 'center' }
           );

        doc.end();
      }
    );
  });
});

module.exports = router;
