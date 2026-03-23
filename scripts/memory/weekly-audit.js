const Database = require('better-sqlite3');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(process.env.HOME, 'kira/memory/unified.db');
const db = new Database(dbPath);

function getStats() {
    const entities = db.prepare('SELECT COUNT(*) as count FROM entities').get().count;
    const relations = db.prepare('SELECT COUNT(*) as count FROM relations').get().count;
    const facts = db.prepare('SELECT COUNT(*) as count FROM facts').get().count;
    
    // Orphans: entities not in relations as source or target
    const orphans = db.prepare(`
        SELECT COUNT(*) as count FROM entities 
        WHERE id NOT IN (SELECT source_id FROM relations) 
        AND id NOT IN (SELECT target_id FROM relations)
    `).get().count;

    return { entities, relations, facts, orphans };
}

console.log('--- Starting Weekly Graph Audit ---');
const before = getStats();
console.log('Stats Before:');
console.log(JSON.stringify(before, null, 2));

console.log('\nRunning normalization and deduplication...');
try {
    const output = execSync('node ~/kira/scripts/memory/graph-improvements.js all', { encoding: 'utf8' });
    console.log(output);
} catch (error) {
    console.error('Error running graph-improvements.js:', error.message);
}

const after = getStats();
console.log('Stats After:');
console.log(JSON.stringify(after, null, 2));

const orphanRate = (after.orphans / after.entities) * 100;
console.log(`\nOrphan Rate: ${orphanRate.toFixed(2)}%`);

if (orphanRate > 20) {
    console.log('⚠️ FLAG: Orphan rate is above 20%. Manual review recommended.');
} else {
    console.log('✅ Graph health within normal parameters.');
}

db.close();
