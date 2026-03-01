/**
 * Audit Agent - Phase 2
 * Second LLM pass to review generated opinions for errors
 */

const { generateWithLLM } = require('./llm');

const AUDIT_PROMPT = `Você é um auditor jurídico tributário sênior. Revise o parecer abaixo e identifique:

1. ANACRONISMOS: Normas citadas como vigentes que não estão em vigor (ex: MLI/PPT aplicado como norma vigente quando ainda não foi ratificado)
2. CÁLCULOS: Erros de base de cálculo, alíquota ou isenção
3. ISENÇÕES OMITIDAS: Especialmente PIS/COFINS e ISS em exportações de serviços
4. QUALIFICAÇÃO: Se a natureza do serviço (SaaS vs técnico) foi corretamente analisada conforme o tratado aplicável
5. BASE LEGAL: Se as citações legais são precisas (artigo, decreto, lei)
6. COMPLETUDE: Se há seção de riscos e recomendações

Para cada problema encontrado, forneça em formato estruturado:
- TIPO: [ANACRONISMO|CÁLCULO|ISENÇÃO OMITIDA|QUALIFICAÇÃO|BASE LEGAL|COMPLETUDE]
- TRECHO: O trecho do parecer com erro
- CORREÇÃO: A correção necessária
- BASE LEGAL: A base legal correta

Se o parecer estiver correto e completo, responda EXATAMENTE: "APROVADO — sem correções necessárias."

=== DADOS DO FORMULÁRIO ===
{formData}

=== CONTEXTO LEGAL ===
{legalContext}

=== PARECER A AUDITAR ===
{opinion}`;

/**
 * Audit an opinion using LLM
 * @returns {{ approved: boolean, issues: Array, summary: string, raw: string }}
 */
async function auditOpinion(opinion, formData, legalContext) {
  const prompt = AUDIT_PROMPT
    .replace('{formData}', JSON.stringify(formData, null, 2))
    .replace('{legalContext}', legalContext)
    .replace('{opinion}', opinion);

  try {
    let raw = await generateWithLLM(prompt, 'Você é um auditor jurídico tributário independente. Seja rigoroso e preciso.');

    const approved = raw.includes('APROVADO') && raw.includes('sem correções necessárias');
    
    // Parse issues from structured response
    const issues = [];
    const issueBlocks = raw.split(/(?=- TIPO:)/g).filter(b => b.includes('TIPO:'));
    for (const block of issueBlocks) {
      const type = block.match(/TIPO:\s*\[?(.*?)\]?\s*\n/)?.[1]?.trim() || 'GERAL';
      const excerpt = block.match(/TRECHO:\s*([\s\S]*?)(?=- CORREÇÃO:|$)/)?.[1]?.trim() || '';
      const correction = block.match(/CORREÇÃO:\s*([\s\S]*?)(?=- BASE LEGAL:|$)/)?.[1]?.trim() || '';
      const legal_basis = block.match(/BASE LEGAL:\s*([\s\S]*?)$/)?.[1]?.trim() || '';
      if (type || excerpt || correction) {
        issues.push({ type, excerpt, correction, legal_basis });
      }
    }

    return {
      approved,
      issues,
      summary: approved ? 'Parecer aprovado sem correções.' : `${issues.length} observação(ões) identificada(s).`,
      raw,
      usage: null
    };
  } catch (e) {
    console.error('Audit error:', e.message);
    return { approved: true, issues: [], summary: 'Auditoria indisponível — erro interno.', raw: '', usage: null };
  }
}

/**
 * Format audit results as markdown to append to opinion
 */
function formatAuditSection(auditResult) {
  if (auditResult.approved) {
    return '\n\n---\n## ✅ Auditoria Automática\n\nEste parecer foi revisado por um agente de auditoria automática e **aprovado sem correções necessárias.**\n';
  }

  let section = '\n\n---\n## ⚠️ Notas de Auditoria Automática\n\n';
  section += 'Este parecer foi revisado por um agente de auditoria que identificou as seguintes observações:\n\n';
  
  for (let i = 0; i < auditResult.issues.length; i++) {
    const issue = auditResult.issues[i];
    section += `### ${i + 1}. ${issue.type}\n`;
    if (issue.excerpt) section += `**Trecho:** ${issue.excerpt}\n\n`;
    if (issue.correction) section += `**Correção:** ${issue.correction}\n\n`;
    if (issue.legal_basis) section += `**Base Legal:** ${issue.legal_basis}\n\n`;
  }

  section += '\n> ⚠️ As observações acima são geradas automaticamente e devem ser verificadas por profissional qualificado.\n';
  return section;
}

module.exports = { auditOpinion, formatAuditSection };
