/**
 * Legal Status Module - Phase 1
 * Hardcoded legal status database for Brazilian tax law instruments
 */

const fs = require('fs');
const path = require('path');

const LEGAL_STATUS = {
  'MLI': {
    name: 'Instrumento Multilateral (MLI)',
    signed: '2025-10-20',
    ratified: false,
    ratification_status: 'Pendente de ratificação pelo Congresso Nacional e depósito na OCDE',
    in_force: false,
    provisions_affected: ['PPT (Principal Purpose Test)', 'LOB (Limitation on Benefits)'],
    note: 'Não aplicar como norma vigente. Mencionar apenas como risco futuro.'
  },
  'REFORMA_TRIBUTARIA': {
    name: 'Reforma Tributária (EC 132/2023, LC 214/2025)',
    in_force: true,
    transition_period: '2026-2033',
    test_rates_2026: { IBS: 0.001, CBS: 0.009 },
    note: 'Período de teste em 2026. Alertar sobre transição.'
  },
  'TRANSFER_PRICING': {
    name: 'Nova Lei de Preços de Transferência (Lei 14.596/2023)',
    in_force: true,
    effective_date: '2024-01-01',
    note: 'Arm\'s length principle. Aplicável a transações entre partes relacionadas.'
  }
};

// Treaty-specific rules - manually curated key countries + auto-populated from corpus
const TREATY_RULES = {
  'Países Baixos': {
    decree: 'Decreto 99.700/1990',
    protocol_item_5: true,
    royalties_rate: 15,
    services_article: 12,
    notes: [
      'Item 5 do Protocolo equipara serviços técnicos a royalties (15% fonte)',
      'SaaS sem intervenção humana pode ser Art. 7 (Lucros das Empresas)'
    ]
  },
  'Alemanha': {
    decree: 'Decreto 76.988/1976',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    services_article: 7,
    notes: ['Sem cláusula de serviços técnicos no protocolo — Art. 7 para lucros empresariais']
  },
  'Argentina': {
    decree: 'Decreto 87.976/1982',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    services_article: 14,
    notes: ['Profissões independentes — Art. 14']
  },
  'Áustria': {
    decree: 'Decreto 78.107/1976',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Bélgica': {
    decree: 'Decreto 72.542/1973',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: ['Convenção adicional vigente']
  },
  'Canadá': {
    decree: 'Decreto 92.318/1986',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Chile': {
    decree: 'Decreto 7.660/2003',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'China': {
    decree: 'Decreto 762/1993',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Coreia do Sul': {
    decree: 'Decreto 354/1991',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: ['Protocolo adicional vigente']
  },
  'Dinamarca': {
    decree: 'Decreto 75.106/1974',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: ['Protocolo adicional vigente']
  },
  'Emirados Árabes Unidos': {
    decree: 'Decreto 9.482/2018',
    royalties_rate: 12,
    dividends_rate: 15,
    interest_rate: 15,
    notes: ['Tratado mais recente, alíquota reduzida para royalties']
  },
  'Equador': {
    decree: 'Decreto 75.717/1975',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Espanha': {
    decree: 'Decreto 76.975/1975',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Filipinas': {
    decree: 'Decreto 241/1991',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Finlândia': {
    decree: 'Decreto 73.496/1974',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'França': {
    decree: 'Decreto 70.506/1972',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Hungria': {
    decree: 'Decreto 53/1991',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Índia': {
    decree: 'Decreto 510/1992',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: ['Protocolo adicional vigente']
  },
  'Israel': {
    decree: 'Decreto 5.576/2005',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Itália': {
    decree: 'Decreto 85.985/1981',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Japão': {
    decree: 'Decreto 61.899/1967',
    royalties_rate: 12.5,
    dividends_rate: 12.5,
    interest_rate: 12.5,
    notes: ['Protocolo adicional vigente', 'Alíquotas diferenciadas']
  },
  'Luxemburgo': {
    decree: 'Decreto 85.051/1980',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'México': {
    decree: 'Decreto 6.000/2006',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Noruega': {
    decree: 'Decreto 86.710/1981',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: ['Nova convenção (2022) pode alterar alíquotas — verificar vigência']
  },
  'Peru': {
    decree: 'Decreto 7.020/2009',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Portugal': {
    decree: 'Decreto 4.012/2001',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Rússia': {
    decree: 'Decreto 5.578/2005',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Singapura': {
    decree: 'Decreto 8.286/2014',
    royalties_rate: 12,
    dividends_rate: 15,
    interest_rate: 15,
    notes: ['Tratado recente, alíquota reduzida para royalties']
  },
  'Suécia': {
    decree: 'Decreto 77.053/1976',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Suíça': {
    decree: 'Decreto 75.182/1975',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'África do Sul': {
    decree: 'Decreto 5.922/2006',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: ['Protocolo adicional vigente']
  },
  'Trinidad e Tobago': {
    decree: 'Decreto 8.335/2014',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Turquia': {
    decree: 'Decreto 6.948/2009',
    royalties_rate: 10,
    dividends_rate: 15,
    interest_rate: 15,
    notes: ['Alíquota reduzida para royalties']
  },
  'Ucrânia': {
    decree: 'Decreto 5.579/2005',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  },
  'Uruguai': {
    decree: 'Decreto 11.196/2022',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: ['Tratado recente']
  },
  'Venezuela': {
    decree: 'Decreto 6.270/2007',
    royalties_rate: 15,
    dividends_rate: 15,
    interest_rate: 15,
    notes: []
  }
};

const EXPORT_EXEMPTIONS = {
  'PIS_COFINS': {
    exempt: true,
    legal_basis: 'MP 2.158-35/2001, art. 14, c/c EC 33/2001',
    requirements: [
      'Tomador residente no exterior',
      'Ingresso efetivo de divisas (SC Cosit 160/2024 aceita meios digitais)'
    ]
  },
  'ISS': {
    exempt: true,
    legal_basis: 'LC 116/2003, art. 2º, I',
    requirements: ['Resultado verificado no exterior']
  }
};

/**
 * Build legal context string for a given form data
 */
function buildLegalContext(formData) {
  const sections = [];

  // Always include MLI and Reforma Tributária status
  sections.push('=== CONTEXTO LEGAL OBRIGATÓRIO ===');
  sections.push('');
  sections.push('--- STATUS DE INSTRUMENTOS LEGAIS ---');
  for (const [key, status] of Object.entries(LEGAL_STATUS)) {
    sections.push(`• ${status.name}:`);
    if (status.in_force === false) {
      sections.push(`  ATENÇÃO: NÃO está em vigor. ${status.ratification_status || ''}`);
    }
    if (status.transition_period) {
      sections.push(`  Período de transição: ${status.transition_period}`);
    }
    if (status.test_rates_2026) {
      sections.push(`  Alíquotas de teste 2026: IBS ${status.test_rates_2026.IBS * 100}% + CBS ${status.test_rates_2026.CBS * 100}%`);
    }
    sections.push(`  ${status.note}`);
    sections.push('');
  }

  // Country-specific treaty rules
  const countries = [
    formData.source_country,
    formData.destination_country,
    formData.country_residence
  ].filter(Boolean);

  for (const country of countries) {
    const normalized = findTreatyCountry(country);
    if (normalized && TREATY_RULES[normalized]) {
      const rules = TREATY_RULES[normalized];
      sections.push(`--- TRATADO BRASIL-${normalized.toUpperCase()} ---`);
      sections.push(`Decreto: ${rules.decree}`);
      if (rules.royalties_rate) sections.push(`Royalties: ${rules.royalties_rate}% na fonte`);
      if (rules.dividends_rate) sections.push(`Dividendos: ${rules.dividends_rate}% na fonte`);
      if (rules.interest_rate) sections.push(`Juros: ${rules.interest_rate}% na fonte`);
      if (rules.protocol_item_5) sections.push(`⚠ Protocolo: serviços técnicos equiparados a royalties`);
      if (rules.services_article) sections.push(`Artigo para serviços: Art. ${rules.services_article}`);
      for (const note of (rules.notes || [])) {
        sections.push(`• ${note}`);
      }
      sections.push('');
    }
  }

  // Export exemptions - check if it's an export operation
  const isExport = isExportOperation(formData);
  if (isExport) {
    sections.push('--- ISENÇÕES DE EXPORTAÇÃO ---');
    for (const [tax, info] of Object.entries(EXPORT_EXEMPTIONS)) {
      sections.push(`• ${tax}: ${info.exempt ? 'ISENTO' : 'NÃO ISENTO'}`);
      sections.push(`  Base legal: ${info.legal_basis}`);
      sections.push(`  Requisitos: ${info.requirements.join('; ')}`);
    }
    sections.push('');
  }

  sections.push('O assistente DEVE considerar estas informações ao redigir o parecer.');
  return sections.join('\n');
}

function isExportOperation(formData) {
  const src = (formData.source_country || '').toLowerCase();
  const dst = (formData.destination_country || '').toLowerCase();
  const res = (formData.country_residence || '').toLowerCase();
  // Export = Brazilian entity providing services/goods to foreign entity
  return (src.includes('brasil') || res.includes('brasil')) && !dst.includes('brasil');
}

function findTreatyCountry(input) {
  if (!input) return null;
  const lower = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const country of Object.keys(TREATY_RULES)) {
    const norm = country.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm === lower || lower.includes(norm) || norm.includes(lower)) return country;
  }
  // Common aliases
  const aliases = {
    'holanda': 'Países Baixos', 'netherlands': 'Países Baixos', 'holland': 'Países Baixos',
    'germany': 'Alemanha', 'france': 'França', 'spain': 'Espanha', 'italy': 'Itália',
    'japan': 'Japão', 'south korea': 'Coreia do Sul', 'korea': 'Coreia do Sul',
    'india': 'Índia', 'south africa': 'África do Sul', 'uae': 'Emirados Árabes Unidos',
    'switzerland': 'Suíça', 'sweden': 'Suécia', 'norway': 'Noruega', 'denmark': 'Dinamarca',
    'finland': 'Finlândia', 'belgium': 'Bélgica', 'austria': 'Áustria', 'hungary': 'Hungria',
    'portugal': 'Portugal', 'russia': 'Rússia', 'ukraine': 'Ucrânia', 'turkey': 'Turquia',
    'singapore': 'Singapura', 'mexico': 'México', 'peru': 'Peru', 'chile': 'Chile',
    'ecuador': 'Equador', 'venezuela': 'Venezuela', 'uruguay': 'Uruguai',
    'canada': 'Canadá', 'china': 'China', 'israel': 'Israel', 'luxembourg': 'Luxemburgo',
    'philippines': 'Filipinas', 'trinidad': 'Trinidad e Tobago',
    'paises baixos': 'Países Baixos', 'africa do sul': 'África do Sul',
    'coreia': 'Coreia do Sul', 'emirados': 'Emirados Árabes Unidos',
  };
  if (aliases[lower]) return aliases[lower];
  return null;
}

module.exports = { LEGAL_STATUS, TREATY_RULES, EXPORT_EXEMPTIONS, buildLegalContext, findTreatyCountry };
