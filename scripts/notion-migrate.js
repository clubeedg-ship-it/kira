#!/usr/bin/env node
/**
 * VDR to Notion Migration Script
 * Migrates QA-approved documents to Notion project pages
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const NOTION_KEY = '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';
const NOTION_VERSION = '2022-06-28';

// Page IDs
const PAGES = {
  zenithcred: '2fba6c94-88ca-817e-bedf-cd0d9ed5881d',
  ottogen: '2a6a6c94-88ca-8094-92f1-fbdb5c839518',
  abura: '2fba6c94-88ca-812a-b1a7-d18636bd9d29',
  cuttingedge: '2fba6c94-88ca-81c2-a2f3-d2f390c1f97c'
};

// Files to migrate
const MIGRATIONS = [
  { file: 'zenithcred-business-model-v2.md', page: 'zenithcred', title: 'Business Model & Financial Projections V2' },
  { file: 'zenithcred-marketing-strategy-v2.md', page: 'zenithcred', title: 'Marketing Strategy & Investor Outreach Plan V2' },
  { file: 'ottogen-brand-strategy.md', page: 'ottogen', title: 'Personal Brand Strategy' },
  { file: 'abura-cosmetics-sales-research-v2.md', page: 'abura', title: 'Sales Expansion Strategy V2' },
  { file: 'cuttingedge-ux-strategy.md', page: 'cuttingedge', title: 'UX Strategy Document' }
];

function notionRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path: `/v1${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${NOTION_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Notion API error: ${json.message || JSON.stringify(json)}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function truncateText(text, maxLength = 2000) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function parseMarkdownToBlocks(markdown, docTitle) {
  const blocks = [];
  const lines = markdown.split('\n');
  
  // Add migration header callout
  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: `📄 Migrated from VDR on 2026-02-05 | Document: ${docTitle}` } }],
      icon: { emoji: '✅' },
      color: 'green_background'
    }
  });
  
  blocks.push({ object: 'block', type: 'divider', divider: {} });

  let i = 0;
  let currentTableRows = [];
  let inTable = false;
  let tableHeaderParsed = false;

  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line.trim()) {
      if (inTable && currentTableRows.length > 0) {
        // End table
        blocks.push(createTableBlock(currentTableRows));
        currentTableRows = [];
        inTable = false;
        tableHeaderParsed = false;
      }
      i++;
      continue;
    }

    // Table detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      
      // Check if this is separator row
      if (cells.every(c => /^[-:]+$/.test(c))) {
        tableHeaderParsed = true;
        i++;
        continue;
      }
      
      inTable = true;
      currentTableRows.push(cells);
      i++;
      continue;
    } else if (inTable && currentTableRows.length > 0) {
      // End table
      blocks.push(createTableBlock(currentTableRows));
      currentTableRows = [];
      inTable = false;
      tableHeaderParsed = false;
    }

    // Headers
    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: { rich_text: [{ type: 'text', text: { content: truncateText(line.substring(2).trim()) } }] }
      });
      i++;
      continue;
    }
    
    if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: truncateText(line.substring(3).trim()) } }] }
      });
      i++;
      continue;
    }
    
    if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: [{ type: 'text', text: { content: truncateText(line.substring(4).trim()) } }] }
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
      i++;
      continue;
    }

    // Bullet points
    if (line.match(/^[-*]\s/)) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: parseRichText(line.substring(2).trim()) }
      });
      i++;
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '');
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: parseRichText(content.trim()) }
      });
      i++;
      continue;
    }

    // Checkbox/todo
    if (line.match(/^-\s*\[\s*[xX]?\s*\]/)) {
      const checked = line.match(/\[\s*[xX]\s*\]/) !== null;
      const content = line.replace(/^-\s*\[\s*[xX]?\s*\]\s*/, '');
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: { 
          rich_text: parseRichText(content.trim()),
          checked: checked
        }
      });
      i++;
      continue;
    }

    // Blockquote / callout
    if (line.startsWith('>')) {
      const content = line.substring(1).trim();
      blocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: parseRichText(content),
          icon: { emoji: '💡' },
          color: 'gray_background'
        }
      });
      i++;
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.substring(3).trim() || 'plain text';
      let code = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      blocks.push({
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: truncateText(code.trimEnd()) } }],
          language: mapLanguage(lang)
        }
      });
      i++;
      continue;
    }

    // Bold/emphasized lines as callouts (for key insights)
    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      const content = line.slice(2, -2);
      blocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ type: 'text', text: { content: truncateText(content) }, annotations: { bold: true } }],
          icon: { emoji: '⚡' },
          color: 'yellow_background'
        }
      });
      i++;
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: parseRichText(line.trim()) }
      });
    }
    
    i++;
  }

  // Handle remaining table
  if (currentTableRows.length > 0) {
    blocks.push(createTableBlock(currentTableRows));
  }

  return blocks;
}

function createTableBlock(rows) {
  if (rows.length === 0) return null;
  
  const width = Math.max(...rows.map(r => r.length));
  
  return {
    object: 'block',
    type: 'table',
    table: {
      table_width: width,
      has_column_header: true,
      has_row_header: false,
      children: rows.map((row, idx) => ({
        object: 'block',
        type: 'table_row',
        table_row: {
          cells: row.map(cell => [{ type: 'text', text: { content: truncateText(cell, 500) } }])
        }
      }))
    }
  };
}

function parseRichText(text) {
  const result = [];
  let remaining = truncateText(text);
  
  // Simple parsing - handle bold, italic, code
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(remaining)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      result.push({ type: 'text', text: { content: remaining.substring(lastIndex, match.index) } });
    }
    
    if (match[2]) {
      // Bold
      result.push({ type: 'text', text: { content: match[2] }, annotations: { bold: true } });
    } else if (match[4]) {
      // Italic
      result.push({ type: 'text', text: { content: match[4] }, annotations: { italic: true } });
    } else if (match[6]) {
      // Code
      result.push({ type: 'text', text: { content: match[6] }, annotations: { code: true } });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < remaining.length) {
    result.push({ type: 'text', text: { content: remaining.substring(lastIndex) } });
  }
  
  return result.length > 0 ? result : [{ type: 'text', text: { content: text } }];
}

function mapLanguage(lang) {
  const map = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'sh': 'bash',
    'bash': 'bash',
    'shell': 'bash',
    'json': 'json',
    'md': 'markdown',
    'markdown': 'markdown',
    'html': 'html',
    'css': 'css',
    'sql': 'sql',
    'plain text': 'plain text',
    '': 'plain text'
  };
  return map[lang.toLowerCase()] || 'plain text';
}

async function appendBlocksInChunks(pageId, blocks) {
  // Notion API limits to 100 blocks per request
  const CHUNK_SIZE = 100;
  
  for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
    const chunk = blocks.slice(i, i + CHUNK_SIZE);
    await notionRequest('PATCH', `/blocks/${pageId}/children`, { children: chunk });
    console.log(`  Appended blocks ${i + 1}-${Math.min(i + CHUNK_SIZE, blocks.length)} of ${blocks.length}`);
    
    // Small delay to avoid rate limiting
    if (i + CHUNK_SIZE < blocks.length) {
      await new Promise(r => setTimeout(r, 350));
    }
  }
}

async function migrate() {
  console.log('🚀 Starting VDR to Notion Migration\n');
  
  const vdrDir = path.join(process.env.HOME, 'clawd/vdr');
  
  for (const migration of MIGRATIONS) {
    console.log(`\n📄 Migrating: ${migration.title}`);
    console.log(`   File: ${migration.file}`);
    console.log(`   Target: ${migration.page} (${PAGES[migration.page]})`);
    
    try {
      // Read markdown file
      const filePath = path.join(vdrDir, migration.file);
      const markdown = fs.readFileSync(filePath, 'utf-8');
      
      // Parse to Notion blocks
      const blocks = parseMarkdownToBlocks(markdown, migration.title);
      console.log(`   Parsed ${blocks.length} blocks`);
      
      // Append to Notion page
      await appendBlocksInChunks(PAGES[migration.page], blocks);
      
      console.log(`   ✅ Successfully migrated!`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Delay between migrations
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n✅ Migration complete!');
}

migrate().catch(console.error);
