#!/usr/bin/env node
/**
 * Treaty Analysis Engine
 * LOB/PPT decision tree + withholding rate lookup + treaty eligibility
 */

const { search } = require('./search');

// Country name normalization map (Portuguese -> slug)
const COUNTRY_MAP = {
  'brasil': null, // domestic
  'africa do sul': 'africa-do-sul',
  'alemanha': 'alemanha',
  'argentina': 'argentina',
  'austria': 'austria',
  'belgica': 'belgica',
  'bélgica': 'belgica',
  'canada': 'canada',
  'canadá': 'canada',
  'chile': 'chile',
  'china': 'china',
  'coreia do sul': 'coreia-do-sul',
  'coréia do sul': 'coreia-do-sul',
  'dinamarca': 'dinamarca',
  'emirados arabes unidos': 'emirados-arabes-unidos',
  'emirados árabes unidos': 'emirados-arabes-unidos',
  'equador': 'equador',
  'espanha': 'espanha',
  'filipinas': 'filipinas',
  'finlandia': 'finlandia',
  'finlândia': 'finlandia',
  'franca': 'franca',
  'frança': 'franca',
  'hungria': 'hungria',
  'india': 'india',
  'índia': 'india',
  'israel': 'israel',
  'italia': 'italia',
  'itália': 'italia',
  'japao': 'japao',
  'japão': 'japao',
  'luxemburgo': 'luxemburgo',
  'mexico': 'mexico',
  'méxico': 'mexico',
  'noruega': 'noruega',
  'paises baixos': 'paises-baixos',
  'países baixos': 'paises-baixos',
  'holanda': 'paises-baixos',
  'peru': 'peru',
  'portugal': 'portugal',
  'russia': 'russia',
  'rússia': 'russia',
  'singapura': 'singapura',
  'suecia': 'suecia',
  'suécia': 'suecia',
  'suica': 'suica',
  'suíça': 'suica',
  'trinidad e tobago': 'trinidad-e-tobago',
  'turquia': 'turquia',
  'ucrania': 'ucrania',
  'ucrânia': 'ucrania',
  'uruguai': 'uruguai',
  'venezuela': 'venezuela',
};

// Income type to treaty article mapping (OECD Model Convention)
const ARTICLE_MAP = {
  'Dividendos': { article: 10, query: 'dividendos pagos sociedade residente' },
  'Juros': { article: 11, query: 'juros pagos provenientes estado contratante' },
  'Royalties': { article: 12, query: 'royalties provenientes estado contratante pagos' },
  'Serviços Técnicos': { article: 12, query: 'serviços técnicos assistência técnica remuneração' },
  'Ganho de Capital': { article: 13, query: 'ganhos de capital alienação bens' },
  'Lucros de Empresa': { article: 7, query: 'lucros empresa estado contratante estabelecimento permanente' },
  'Rendimentos Imobiliários': { article: 6, query: 'rendimentos imobiliários bens imóveis situados' },
  'Pensões': { article: 18, query: 'pensões remunerações análogas pagas residente' },
};

function normalizeCountry(name) {
  if (!name) return null;
  const key = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  // Try exact match first
  for (const [k, v] of Object.entries(COUNTRY_MAP)) {
    const kNorm = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (kNorm === key || k === key) return v;
  }
  // Partial match
  for (const [k, v] of Object.entries(COUNTRY_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

function hasTreaty(countrySlug) {
  return countrySlug !== null && countrySlug !== undefined;
}

/**
 * Analyze treaty applicability and find relevant provisions
 */
async function analyzeTreaty(formData) {
  const analysis = {
    hasTreaty: false,
    countrySlug: null,
    countryName: '',
    incomeType: formData.income_type,
    relevantArticle: null,
    treatyProvisions: [],
    lobAnalysis: null,
    pptAnalysis: null,
    risks: [],
    recommendations: [],
  };

  // Determine which country to look up treaty for
  const sourceCountry = formData.source_country;
  const destCountry = formData.destination_country;
  
  // One of them should be Brasil, the other is the treaty partner
  let partnerCountry = '';
  if (sourceCountry?.toLowerCase().includes('brasil')) {
    partnerCountry = destCountry;
  } else if (destCountry?.toLowerCase().includes('brasil')) {
    partnerCountry = sourceCountry;
  } else {
    partnerCountry = sourceCountry; // best guess
  }

  analysis.countryName = partnerCountry;
  analysis.countrySlug = normalizeCountry(partnerCountry);
  analysis.hasTreaty = hasTreaty(analysis.countrySlug);

  if (!analysis.hasTreaty) {
    analysis.risks.push({
      level: 'alto',
      description: `Não existe tratado de dupla tributação entre Brasil e ${partnerCountry}. A tributação seguirá as regras internas de cada jurisdição.`
    });
    analysis.recommendations.push(
      'Verificar possibilidade de utilização de crédito de imposto pago no exterior (art. 26 da Lei 9.249/95)',
      'Avaliar se existe acordo de troca de informações (TIEA) entre as jurisdições',
      'Considerar reestruturação via jurisdição com tratado vigente'
    );
    return analysis;
  }

  // Find relevant treaty article
  const articleInfo = ARTICLE_MAP[formData.income_type] || { article: null, query: formData.income_type };
  analysis.relevantArticle = articleInfo.article;

  // Search for specific provisions
  const queries = [
    `${articleInfo.query} ${analysis.countrySlug}`,
    `${formData.income_type?.toLowerCase()} alíquota retenção fonte ${partnerCountry}`,
    `limitação benefícios propósito principal ${partnerCountry}`,
  ];

  for (const q of queries) {
    const results = await search(q, 4);
    for (const r of results) {
      if (r.score > 0.65) {
        analysis.treatyProvisions.push({
          country: r.country,
          text: r.text,
          score: r.score,
          metadata: JSON.parse(r.metadata || '{}')
        });
      }
    }
  }

  // LOB Analysis
  analysis.lobAnalysis = assessLOB(formData);
  
  // PPT Analysis
  analysis.pptAnalysis = assessPPT(formData);

  // Risk assessment
  if (formData.has_substance === 'Não') {
    analysis.risks.push({
      level: 'alto',
      description: 'Ausência de substância econômica no país de residência pode resultar em negação de benefícios do tratado.'
    });
  }
  if (formData.has_substance === 'Parcial') {
    analysis.risks.push({
      level: 'medio',
      description: 'Substância econômica parcial pode ser questionada pelas autoridades fiscais. Recomenda-se documentação robusta.'
    });
  }
  if (formData.has_pe === 'A ser avaliado') {
    analysis.risks.push({
      level: 'medio',
      description: 'A existência de estabelecimento permanente deve ser avaliada com base nos critérios do tratado aplicável.'
    });
  }
  if (formData.intermediary_countries) {
    analysis.risks.push({
      level: 'medio',
      description: 'Presença de jurisdições intermediárias pode levantar questionamentos sobre treaty shopping.'
    });
  }

  return analysis;
}

function assessLOB(formData) {
  const result = {
    applicable: false,
    eligible: null,
    reasoning: '',
  };

  // LOB clauses are less common in Brazilian treaties, but check
  if (formData.client_type === 'Empresa Multinacional') {
    result.applicable = true;
    if (formData.has_substance === 'Sim') {
      result.eligible = true;
      result.reasoning = 'Entidade apresenta substância econômica, favorecendo elegibilidade sob cláusula LOB.';
    } else if (formData.has_substance === 'Não') {
      result.eligible = false;
      result.reasoning = 'Ausência de substância econômica pode impedir acesso aos benefícios do tratado sob cláusula LOB.';
    } else {
      result.eligible = null;
      result.reasoning = 'Necessária análise detalhada da substância econômica para determinar elegibilidade LOB.';
    }
  } else {
    result.reasoning = 'Cláusula LOB geralmente aplicável a entidades corporativas complexas.';
  }

  return result;
}

function assessPPT(formData) {
  const result = {
    applicable: true, // PPT is in most modern treaties
    passes: null,
    reasoning: '',
    factors: [],
  };

  // Positive factors
  if (formData.has_substance === 'Sim') {
    result.factors.push({ positive: true, text: 'Substância econômica presente no país de residência' });
  }
  if (!formData.intermediary_countries) {
    result.factors.push({ positive: true, text: 'Estrutura direta sem jurisdições intermediárias' });
  }
  if (formData.objective === 'Conformidade Regulatória') {
    result.factors.push({ positive: true, text: 'Operação motivada por conformidade, não por planejamento agressivo' });
  }

  // Negative factors
  if (formData.has_substance === 'Não') {
    result.factors.push({ positive: false, text: 'Ausência de substância econômica' });
  }
  if (formData.intermediary_countries) {
    result.factors.push({ positive: false, text: 'Uso de jurisdições intermediárias pode sugerir treaty shopping' });
  }
  if (formData.objective === 'Redução de Carga Tributária') {
    result.factors.push({ positive: false, text: 'Objetivo primário de redução tributária pode ser questionado sob PPT' });
  }

  const positives = result.factors.filter(f => f.positive).length;
  const negatives = result.factors.filter(f => !f.positive).length;

  if (positives > negatives) {
    result.passes = true;
    result.reasoning = 'Análise preliminar sugere que a operação atende ao Teste de Propósito Principal (PPT).';
  } else if (negatives > positives) {
    result.passes = false;
    result.reasoning = 'Há fatores significativos que podem comprometer o PPT. Recomenda-se revisão da estrutura.';
  } else {
    result.passes = null;
    result.reasoning = 'Resultado do PPT inconclusivo. Necessária análise detalhada com documentação de suporte.';
  }

  return result;
}

module.exports = { analyzeTreaty, normalizeCountry, hasTreaty, COUNTRY_MAP };

// CLI test
if (require.main === module) {
  analyzeTreaty({
    client_name: 'Teste',
    client_type: 'Pessoa Jurídica',
    country_residence: 'Holanda',
    income_type: 'Dividendos',
    income_description: 'Distribuição de dividendos de subsidiária brasileira',
    source_country: 'Brasil',
    destination_country: 'Países Baixos',
    has_pe: 'Não',
    has_substance: 'Sim',
    objective: 'Eliminação de Dupla Tributação',
  }).then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
}
