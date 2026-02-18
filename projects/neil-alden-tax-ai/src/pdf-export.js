#!/usr/bin/env node
/**
 * PDF Export for Tax Opinions
 * Generates professional PDF from parecer text
 */

const PDFDocument = require('pdfkit');

function generatePDF(data, stream) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
    info: {
      Title: `Parecer Tributário - ${data.formData?.client_name || 'Cliente'}`,
      Author: 'Neil Alden Advocacia Tributária',
      Subject: 'Parecer Tributário Internacional',
      Creator: 'Neil Alden Tax AI',
    }
  });

  doc.pipe(stream);

  // Header
  doc.fontSize(10).fillColor('#666')
    .text('NEIL ALDEN ADVOCACIA TRIBUTÁRIA', { align: 'center' })
    .text('Parecer Tributário Inteligente', { align: 'center' })
    .moveDown(0.5);

  doc.moveTo(72, doc.y).lineTo(523, doc.y).stroke('#1a365d');
  doc.moveDown(1);

  // Title
  doc.fontSize(16).fillColor('#1a365d')
    .text('PARECER TRIBUTÁRIO', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#333')
    .text(`Cliente: ${data.formData?.client_name || 'N/A'}`, { align: 'center' });
  doc.fontSize(9).fillColor('#666')
    .text(`Data: ${new Date(data.generatedAt || Date.now()).toLocaleDateString('pt-BR')}`, { align: 'center' });
  doc.moveDown(1);

  // Body — parse markdown-like text
  const lines = (data.opinion || '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      doc.moveDown(0.3);
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      doc.moveDown(0.5).fontSize(11).fillColor('#1a365d').font('Helvetica-Bold')
        .text(trimmed.replace(/^###\s*/, '').replace(/\*\*/g, ''));
      doc.font('Helvetica').fillColor('#333').fontSize(10);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      doc.moveDown(0.5).fontSize(12).fillColor('#1a365d').font('Helvetica-Bold')
        .text(trimmed.replace(/^##\s*/, '').replace(/\*\*/g, ''));
      doc.font('Helvetica').fillColor('#333').fontSize(10);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      doc.moveDown(0.5).fontSize(14).fillColor('#1a365d').font('Helvetica-Bold')
        .text(trimmed.replace(/^#\s*/, '').replace(/\*\*/g, ''));
      doc.font('Helvetica').fillColor('#333').fontSize(10);
      continue;
    }

    // Bold sections (like **TITLE**)
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      doc.moveDown(0.3).font('Helvetica-Bold').fontSize(11).fillColor('#1a365d')
        .text(trimmed.replace(/\*\*/g, ''));
      doc.font('Helvetica').fillColor('#333').fontSize(10);
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      doc.fontSize(10).fillColor('#333').font('Helvetica')
        .text(`  •  ${trimmed.substring(2)}`, { indent: 15 });
      continue;
    }

    // Regular text — handle inline bold
    const plain = trimmed.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
    doc.fontSize(10).fillColor('#333').font('Helvetica').text(plain, { lineGap: 2 });
  }

  // Footer: sources
  if (data.sources?.length) {
    doc.moveDown(1);
    doc.moveTo(72, doc.y).lineTo(523, doc.y).stroke('#ccc');
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#666').font('Helvetica-Bold').text('Fontes Consultadas:');
    doc.font('Helvetica');
    for (const s of data.sources) {
      doc.text(`  •  ${s}`);
    }
  }

  // Disclaimer
  doc.moveDown(1);
  doc.fontSize(8).fillColor('#999')
    .text('Este parecer foi gerado com auxílio de inteligência artificial e deve ser revisado por profissional habilitado antes de sua utilização como base para decisões jurídicas ou fiscais.', { align: 'center' });

  doc.end();
  return doc;
}

module.exports = { generatePDF };
