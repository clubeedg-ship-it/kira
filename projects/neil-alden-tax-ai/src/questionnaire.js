/**
 * Questionnaire schema + prompt builder
 */
const { buildLegalContext } = require('./legal-status');

const QUESTIONNAIRE = {
  steps: [
    {
      id: 'client_info',
      title: 'Informações do Cliente',
      fields: [
        { id: 'client_name', label: 'Nome/Razão Social', type: 'text', required: true },
        { id: 'client_type', label: 'Tipo de Contribuinte', type: 'select', required: true,
          options: ['Pessoa Física', 'Pessoa Jurídica', 'Empresa Multinacional'] },
        { id: 'country_residence', label: 'País de Residência Fiscal', type: 'text', required: true },
        { id: 'cnpj_cpf', label: 'CNPJ/CPF', type: 'text', required: false },
      ]
    },
    {
      id: 'operation',
      title: 'Natureza da Operação',
      fields: [
        { id: 'income_type', label: 'Tipo de Rendimento', type: 'select', required: true,
          options: ['Dividendos', 'Juros', 'Royalties', 'Serviços Técnicos', 'Ganho de Capital',
                    'Lucros de Empresa', 'Rendimentos Imobiliários', 'Pensões', 'Outros'] },
        { id: 'income_description', label: 'Descrição Detalhada da Operação', type: 'textarea', required: true },
        { id: 'amount', label: 'Valor Estimado (BRL)', type: 'number', required: false },
        { id: 'frequency', label: 'Frequência', type: 'select', required: true,
          options: ['Única', 'Mensal', 'Trimestral', 'Anual', 'Contínua'] },
      ]
    },
    {
      id: 'jurisdictions',
      title: 'Jurisdições Envolvidas',
      fields: [
        { id: 'source_country', label: 'País de Origem do Rendimento', type: 'text', required: true },
        { id: 'destination_country', label: 'País de Destino do Rendimento', type: 'text', required: true },
        { id: 'intermediary_countries', label: 'Países Intermediários (se houver)', type: 'text', required: false },
        { id: 'has_pe', label: 'Existe Estabelecimento Permanente?', type: 'select', required: true,
          options: ['Sim', 'Não', 'A ser avaliado'] },
        { id: 'has_substance', label: 'A empresa possui substância econômica no país de residência? (escritório físico, funcionários, decisões tomadas localmente)', type: 'select', required: true,
          options: ['Sim — escritório, funcionários e decisões locais', 'Parcial — alguma presença mas limitada', 'Não — estrutura sem presença real'] },
        { id: 'currency_inflow', label: 'Haverá ingresso efetivo de divisas no Brasil?', type: 'select', required: true,
          options: ['Sim — pagamento direto em moeda estrangeira', 'Sim — via plataforma digital/conversão indireta', 'Não', 'A definir'] },
        { id: 'service_nature', label: 'Natureza do serviço/produto', type: 'select', required: true,
          options: ['Licenciamento de software (SaaS) sem intervenção humana', 'Serviço técnico com expertise humana', 'Consultoria/assessoria profissional', 'Cessão de direitos/propriedade intelectual', 'Misto — software + serviço humano'] },
      ]
    },
    {
      id: 'objectives',
      title: 'Objetivos do Planejamento',
      fields: [
        { id: 'objective', label: 'Objetivo Principal', type: 'select', required: true,
          options: ['Redução de Carga Tributária', 'Eliminação de Dupla Tributação',
                    'Conformidade Regulatória', 'Reestruturação Societária', 'Repatriação de Lucros'] },
        { id: 'additional_notes', label: 'Observações Adicionais', type: 'textarea', required: false },
        { id: 'urgency', label: 'Prazo', type: 'select', required: true,
          options: ['Urgente (< 1 semana)', 'Normal (2-4 semanas)', 'Planejamento (> 1 mês)'] },
      ]
    }
  ]
};

function buildPrompt(formData, treatyAnalysis) {
  let analysisContext = '';
  let context = '';
  const sources = new Set();

  if (treatyAnalysis.hasTreaty) {
    analysisContext = `Tratado aplicável: Brasil-${treatyAnalysis.countryName}, Artigo ${treatyAnalysis.relevantArticle || '?'}`;
    if (treatyAnalysis.pptAnalysis) {
      analysisContext += `\nPPT: ${treatyAnalysis.pptAnalysis.reasoning}`;
    }
    if (treatyAnalysis.risks.length) {
      analysisContext += '\nRiscos: ' + treatyAnalysis.risks.map(r => `[${r.level}] ${r.description}`).join('; ');
    }
    for (const p of treatyAnalysis.treatyProvisions.slice(0, 3)) {
      context += `\n[${p.metadata.country || p.country} - ${p.metadata.decreto || ''}]: ${p.text.substring(0, 300)}`;
      sources.add(`${p.metadata.country || p.country} - ${p.metadata.decreto || 'N/A'}`);
    }
  } else {
    analysisContext = `Não existe tratado entre Brasil e ${treatyAnalysis.countryName}.`;
  }

  const legalContext = buildLegalContext(formData);

  const prompt = `Dados: ${formData.client_name} (${formData.client_type}), residente em ${formData.country_residence}.
Operação: ${formData.income_type} - ${formData.income_description}. Valor: R$${formData.amount || '?'}. Frequência: ${formData.frequency}.
Jurisdições: ${formData.source_country} → ${formData.destination_country}. EP: ${formData.has_pe}. Substância: ${formData.has_substance}.
Ingresso de divisas: ${formData.currency_inflow || 'Não informado'}. Natureza do serviço: ${formData.service_nature || 'Não informado'}.
Objetivo: ${formData.objective}.

Análise: ${analysisContext}

Trechos dos tratados:${context || ' Nenhum encontrado.'}

${legalContext}

Gere PARECER TRIBUTÁRIO com: 1) Resumo Executivo 2) Fundamentação Jurídica (cite artigos) 3) Carga Tributária Estimada 4) Riscos 5) Recomendações`;

  return { prompt, sources: [...sources], legalContext };
}

module.exports = { QUESTIONNAIRE, buildPrompt };
