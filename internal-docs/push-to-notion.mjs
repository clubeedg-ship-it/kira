import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const API_KEY = readFileSync(join(homedir(), '.config/notion/api_key'), 'utf8').trim();
const NOTION_VERSION = '2022-06-28';
const COMMAND_CENTER = '300a6c94-88ca-8123-a75e-f9238180e463';

async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`API error ${res.status}:`, JSON.stringify(data, null, 2));
    throw new Error(`Notion API ${res.status}`);
  }
  return data;
}

function mdToBlocks(md) {
  const blocks = [];
  const lines = md.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line.trim()) { i++; continue; }
    
    // Headings
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^###+ (.+)/);
    
    if (h1) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: richText(h1[1]) } });
      i++; continue;
    }
    if (h2) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: richText(h2[1]) } });
      i++; continue;
    }
    if (h3) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: richText(h3[1]) } });
      i++; continue;
    }
    
    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
      i++; continue;
    }
    
    // Bullet list items
    const bullet = line.match(/^[\s]*[-*+] (.+)/);
    if (bullet) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: richText(bullet[1]) } });
      i++; continue;
    }

    // Numbered list
    const numbered = line.match(/^[\s]*\d+\.\s+(.+)/);
    if (numbered) {
      blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: richText(numbered[1]) } });
      i++; continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3) || 'plain text';
      let code = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      i++; // skip closing ```
      // Chunk code to 2000 chars
      const chunks = chunkString(code.trimEnd(), 2000);
      for (const chunk of chunks) {
        blocks.push({ object: 'block', type: 'code', code: { rich_text: [{ type: 'text', text: { content: chunk } }], language: lang === 'plain text' ? 'plain text' : lang } });
      }
      continue;
    }

    // Table (simplified: convert to code block)
    if (line.includes('|') && line.trim().startsWith('|')) {
      let table = '';
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        table += lines[i] + '\n';
        i++;
      }
      const chunks = chunkString(table.trimEnd(), 2000);
      for (const chunk of chunks) {
        blocks.push({ object: 'block', type: 'code', code: { rich_text: [{ type: 'text', text: { content: chunk } }], language: 'plain text' } });
      }
      continue;
    }

    // Regular paragraph - collect consecutive lines
    let para = line;
    i++;
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^#{1,6} /) && !lines[i].match(/^[-*+] /) && !lines[i].match(/^\d+\.\s/) && !lines[i].trim().startsWith('```') && !lines[i].trim().startsWith('|') && !/^---+$/.test(lines[i].trim())) {
      para += ' ' + lines[i].trim();
      i++;
    }
    
    const chunks = chunkString(para, 2000);
    for (const chunk of chunks) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: richText(chunk) } });
    }
  }
  
  return blocks;
}

function richText(text) {
  // Simple: just plain text, handle bold/italic inline
  const chunks = chunkString(text, 2000);
  return chunks.map(c => ({ type: 'text', text: { content: c } }));
}

function chunkString(str, max) {
  if (str.length <= max) return [str];
  const chunks = [];
  let pos = 0;
  while (pos < str.length) {
    chunks.push(str.slice(pos, pos + max));
    pos += max;
  }
  return chunks;
}

async function appendBlocks(pageId, blocks) {
  // Notion limits 100 blocks per request
  for (let i = 0; i < blocks.length; i += 100) {
    const batch = blocks.slice(i, i + 100);
    await notion('PATCH', `/blocks/${pageId}/children`, { children: batch });
    if (i + 100 < blocks.length) await new Promise(r => setTimeout(r, 350));
  }
}

async function createChildPage(parentId, title, filePath) {
  const md = readFileSync(filePath, 'utf8');
  const blocks = mdToBlocks(md);
  
  console.log(`Creating "${title}" (${blocks.length} blocks)...`);
  
  const page = await notion('POST', '/pages', {
    parent: { page_id: parentId },
    properties: { title: { title: [{ text: { content: title } }] } },
    children: blocks.slice(0, 100),
  });
  
  // Append remaining blocks
  if (blocks.length > 100) {
    const remaining = blocks.slice(100);
    await appendBlocks(page.id, remaining);
  }
  
  console.log(`  ✅ ${page.id} (${blocks.length} blocks)`);
  return page.id;
}

async function main() {
  const log = ['# Notion VDR Sync Log', `Date: ${new Date().toISOString()}`, ''];
  
  // Create parent page
  console.log('Creating 📚 Research & VDR...');
  const parent = await notion('POST', '/pages', {
    parent: { page_id: COMMAND_CENTER },
    properties: { title: { title: [{ text: { content: '📚 Research & VDR' } }] } },
    children: [],
  });
  const vdrId = parent.id;
  console.log(`✅ Parent: ${vdrId}`);
  log.push(`## Parent Page`, `- 📚 Research & VDR: \`${vdrId}\``, '', '## Child Pages');
  
  const docs = [
    ['~/kira/vdr/sales-automation-research.md', '🔥 Sales Automation Playbook'],
    ['~/kira/vdr/project-management-research.md', '📊 PM Framework Research'],
    ['~/kira/vdr/ceo-daily-routine-framework.md', '👔 CEO Daily Routine'],
    ['~/kira/vdr/zenithcred-business-model-v2.md', '💰 ZenithCred Business Model'],
    ['~/kira/vdr/ottogen-brand-strategy.md', '🎯 OttoGen Brand Strategy'],
    ['~/kira/vdr/cuttingedge-ux-strategy.md', '✂️ CuttingEdge UX Strategy'],
  ];
  
  for (const [file, title] of docs) {
    const path = file.replace('~', homedir());
    await new Promise(r => setTimeout(r, 350)); // rate limit
    const id = await createChildPage(vdrId, title, path);
    log.push(`- ${title}: \`${id}\``);
  }
  
  const logPath = join(homedir(), 'clawd/vdr/notion-vdr-sync-log.md');
  writeFileSync(logPath, log.join('\n'));
  console.log('\nDone! Log written to', logPath);
}

main().catch(e => { console.error(e); process.exit(1); });
