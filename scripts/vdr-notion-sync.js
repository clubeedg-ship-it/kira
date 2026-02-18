#!/usr/bin/env node
// VDR-to-Notion Sync Script
// Syncs ~/kira/vdr/*.md files to Notion Document Index database

const fs = require('fs');
const path = require('path');

const VDR_DIR = path.join(process.env.HOME, 'kira/vdr');
const SYNC_STATE_PATH = path.join(VDR_DIR, '.sync-state.json');
const DB_ID = '36344c15-d27d-4b33-904c-5b180f181b28';
const NOTION_VERSION = '2022-06-28';

let API_KEY;
try {
  API_KEY = fs.readFileSync(path.join(process.env.HOME, '.config/notion/api_key'), 'utf8').trim();
} catch (e) {
  console.error('Cannot read Notion API key from ~/.config/notion/api_key');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function notionRequest(url, method = 'GET', body = null, retries = 3) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '2', 10);
      console.log(`  Rate limited, waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      continue;
    }
    const data = await res.json();
    if (!res.ok) {
      if (attempt < retries && res.status >= 500) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      console.error(`Notion API error ${res.status}:`, JSON.stringify(data, null, 2));
      throw new Error(`Notion API ${res.status}`);
    }
    // Small delay to avoid hitting rate limits
    await sleep(100);
    return data;
  }
  throw new Error('Max retries exceeded');
}

// --- Markdown to Notion blocks converter ---
function markdownToBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'plain text';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const code = codeLines.join('\n');
      // Notion code block content max 2000 chars
      const chunks = chunkString(code, 2000);
      for (const chunk of chunks) {
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: chunk } }],
            language: mapLanguage(lang),
          }
        });
      }
      continue;
    }

    // Table (convert to bullet list)
    if (line.includes('|') && line.trim().startsWith('|')) {
      // Collect table lines
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const tl = lines[i].trim();
        // Skip separator lines
        if (!/^\|[\s\-:|]+\|$/.test(tl)) {
          tableLines.push(tl);
        }
        i++;
      }
      for (const tl of tableLines) {
        const cells = tl.split('|').filter(c => c.trim()).map(c => c.trim());
        blocks.push(bulletBlock(cells.join(' | ')));
      }
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    if (h3) { blocks.push(headingBlock(3, h3[1])); i++; continue; }
    const h2 = line.match(/^## (.+)/);
    if (h2) { blocks.push(headingBlock(2, h2[1])); i++; continue; }
    const h1 = line.match(/^# (.+)/);
    if (h1) { blocks.push(headingBlock(1, h1[1])); i++; continue; }

    // Bullet list
    if (/^[\-\*] /.test(line.trim())) {
      blocks.push(bulletBlock(line.trim().replace(/^[\-\*] /, '')));
      i++; continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line.trim())) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: richText(line.trim().replace(/^\d+\. /, '')) }
      });
      i++; continue;
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: { rich_text: richText(line.trim().slice(2)) }
      });
      i++; continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
      i++; continue;
    }

    // Empty line
    if (line.trim() === '') { i++; continue; }

    // Paragraph
    blocks.push(paragraphBlock(line));
    i++;
  }

  return blocks;
}

function richText(text) {
  // Split into chunks of 2000 chars
  const chunks = chunkString(text, 2000);
  return chunks.map(c => {
    // Parse inline formatting
    return { type: 'text', text: { content: c } };
  });
}

function chunkString(str, size) {
  if (str.length <= size) return [str];
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

function headingBlock(level, text) {
  const type = `heading_${level}`;
  return { object: 'block', type, [type]: { rich_text: richText(text) } };
}

function bulletBlock(text) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: richText(text) }
  };
}

function paragraphBlock(text) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: richText(text) }
  };
}

function mapLanguage(lang) {
  const map = {
    'js': 'javascript', 'ts': 'typescript', 'py': 'python',
    'sh': 'bash', 'shell': 'bash', 'json': 'json', 'yaml': 'yaml',
    'yml': 'yaml', 'html': 'html', 'css': 'css', 'sql': 'sql',
    'md': 'markdown', 'markdown': 'markdown', 'bash': 'bash',
    'javascript': 'javascript', 'typescript': 'typescript', 'python': 'python',
    'plain text': 'plain text', 'text': 'plain text',
  };
  return map[lang.toLowerCase()] || 'plain text';
}

// --- Notion API operations ---

async function findPageByName(filename) {
  const data = await notionRequest(`https://api.notion.com/v1/databases/${DB_ID}/query`, 'POST', {
    filter: {
      property: 'Name',
      title: { equals: filename }
    }
  });
  // Return first non-archived page
  const live = data.results.find(p => !p.archived);
  return live || null;
}

async function deleteAllBlocks(pageId) {
  // Get existing children and delete them
  const children = await notionRequest(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`);
  for (const block of children.results) {
    await notionRequest(`https://api.notion.com/v1/blocks/${block.id}`, 'DELETE');
  }
  // Handle pagination
  if (children.has_more) {
    await deleteAllBlocks(pageId); // recurse until all deleted
  }
}

async function appendBlocks(pageId, blocks) {
  // Chunk into groups of 100
  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);
    await notionRequest(`https://api.notion.com/v1/blocks/${pageId}/children`, 'PATCH', {
      children: chunk,
    });
  }
}

async function createPage(filename, blocks) {
  const firstChunk = blocks.slice(0, 100);
  const page = await notionRequest('https://api.notion.com/v1/pages', 'POST', {
    parent: { database_id: DB_ID },
    properties: {
      Name: { title: [{ text: { content: filename } }] },
      Status: { select: { name: 'Synced from VDR' } },
      'Date Modified': { date: { start: new Date().toISOString().split('T')[0] } },
    },
    children: firstChunk,
  });

  // Append remaining blocks
  if (blocks.length > 100) {
    await appendBlocks(page.id, blocks.slice(100));
  }
  return page.id;
}

async function updatePage(pageId, filename, blocks) {
  // Archive old page and create new one (much faster than deleting blocks one by one)
  try {
    await notionRequest(`https://api.notion.com/v1/pages/${pageId}`, 'PATCH', {
      archived: true,
    });
  } catch (e) {
    // Already archived or deleted — that's fine
  }
  return await createPage(filename, blocks);
}

// --- Main ---
async function main() {
  const force = process.argv.includes('--force');

  // Load sync state
  let syncState = {};
  if (fs.existsSync(SYNC_STATE_PATH)) {
    syncState = JSON.parse(fs.readFileSync(SYNC_STATE_PATH, 'utf8'));
  }
  // Build lookup from basename to old sync state for migration
  const oldStateByBasename = {};
  for (const [key, val] of Object.entries(syncState)) {
    if (!key.includes('/')) {
      oldStateByBasename[key] = val;
    }
  }

  // Get all .md files recursively
  function findMdFiles(dir, base = '') {
    let results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = base ? path.join(base, entry.name) : entry.name;
      if (entry.isDirectory()) {
        results = results.concat(findMdFiles(path.join(dir, entry.name), rel));
      } else if (entry.name.endsWith('.md')) {
        results.push(rel);
      }
    }
    return results;
  }
  const files = findMdFiles(VDR_DIR);
  console.log(`Found ${files.length} markdown files in VDR`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const filepath = path.join(VDR_DIR, file);
    let stat;
    try { stat = fs.statSync(filepath); } catch { skipped++; continue; }
    const mtime = stat.mtimeMs.toString();
    const filename = path.basename(file).replace(/\.md$/, '');

    // Check if changed since last sync
    if (!force && syncState[file] && syncState[file].mtime === mtime) {
      skipped++;
      continue;
    }

    console.log(`Syncing: ${file}`);
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const blocks = markdownToBlocks(content);

      // Check if page exists (migrate old keys by basename)
      const basename = path.basename(file);
      const stateEntry = syncState[file] || oldStateByBasename[basename];
      let pageId;
      if (stateEntry && stateEntry.notionPageId) {
        try {
          pageId = await updatePage(stateEntry.notionPageId, filename, blocks);
        } catch (e) {
          const existing = await findPageByName(filename);
          if (existing) {
            pageId = await updatePage(existing.id, filename, blocks);
          } else {
            pageId = await createPage(filename, blocks);
          }
        }
      } else {
        const existing = await findPageByName(filename);
        if (existing) {
          pageId = await updatePage(existing.id, filename, blocks);
        } else {
          pageId = await createPage(filename, blocks);
        }
      }

      syncState[file] = { mtime, notionPageId: pageId };
      // Save state after each file
      fs.writeFileSync(SYNC_STATE_PATH, JSON.stringify(syncState, null, 2));
      synced++;
      console.log(`  ✓ ${file} → ${pageId}`);
    } catch (e) {
      console.error(`  ✗ ${file}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nDone: ${synced} synced, ${skipped} skipped, ${errors} errors`);
}

main().catch(e => { console.error(e); process.exit(1); });
