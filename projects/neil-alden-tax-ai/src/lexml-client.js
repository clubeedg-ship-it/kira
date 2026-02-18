/**
 * LexML Integration Client (future-ready)
 * Only active when LEXML_ENABLED=true
 */

const LEXML_ENABLED = process.env.LEXML_ENABLED === 'true';

async function searchLexML(query) {
  if (!LEXML_ENABLED) return [];
  
  try {
    const url = `https://www.lexml.gov.br/busca/SRU?operation=searchRetrieve&query=${encodeURIComponent(query)}&maximumRecords=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    
    const xml = await res.text();
    // Basic XML parsing for legal references
    const records = [];
    const matches = xml.matchAll(/<srw:recordData>([\s\S]*?)<\/srw:recordData>/g);
    for (const match of matches) {
      const data = match[1];
      const urn = data.match(/<dc:identifier>(.*?)<\/dc:identifier>/)?.[1] || '';
      const title = data.match(/<dc:title>(.*?)<\/dc:title>/)?.[1] || '';
      const date = data.match(/<dc:date>(.*?)<\/dc:date>/)?.[1] || '';
      if (urn || title) records.push({ urn, title, date });
    }
    return records;
  } catch (e) {
    console.error('LexML search error:', e.message);
    return [];
  }
}

module.exports = { searchLexML, LEXML_ENABLED };
