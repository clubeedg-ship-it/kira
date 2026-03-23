import fs from 'fs';
import path from 'path';

export async function syncMem0ToMarkdown() {
  try {
    const Database = (await import('better-sqlite3')).default;
    const dbPath = process.env.MEM0_DB_PATH || '/home/adminuser/kira/app/mem0-history.db';
    if (!fs.existsSync(dbPath)) return;
    
    const histDb = new Database(dbPath, { readonly: true });
    const rows = histDb.prepare(`
      SELECT new_value, created_at 
      FROM memory_history 
      WHERE is_deleted = 0 AND action = 'ADD'
      ORDER BY id DESC LIMIT 500
    `).all() as any[];

    const lines = ['# Mem0 Extracted Facts\n\n*Auto-synced from Mem0 history database*\n'];
    for (const row of rows) {
      if (!row.new_value) continue;
      const d = row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : 'Unknown';
      lines.push(`- [${d}] ${row.new_value}`);
    }

    const outPath = '/home/adminuser/kira/memory/mem0-sync.md';
    fs.writeFileSync(outPath, lines.join('\n'));
    console.log(`[mem0-sync] Synced ${rows.length} facts to ${outPath}`);
  } catch (err: any) {
    console.error('[mem0-sync] Error:', err.message);
  }
}

import { fileURLToPath } from 'url';
if (import.meta.url === `file://${process.argv[1]}`) {
  syncMem0ToMarkdown();
}
