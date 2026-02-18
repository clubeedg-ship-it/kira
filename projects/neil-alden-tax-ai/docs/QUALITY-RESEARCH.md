# Quality Research — Critical Review of AI-Generated Tax Opinions

*Date: 2026-02-13*
*Source: Independent legal review of Stella Vic's output*

## Critical Bugs Found

1. **MLI/PPT applied as current law** — Brazil signed 20/10/2025, not ratified
2. **PIS/COFINS charged on exports** — should be exempt (MP 2.158-35/2001)
3. **Wrong IRPJ/CSLL base** — used net revenue instead of gross
4. **Ambiguous PPT form question** — AI inverted the meaning

## Fixes Applied (Phase 0)

- [x] System prompt expanded to 10 mandatory rules
- [x] Questionnaire: 3 new fields (currency inflow, service nature, substance detail)
- [x] MLI/PPT explicitly marked NOT in force
- [x] Export exemption rules enforced
- [x] Calculation base corrected

## Roadmap

### Phase 1: RAG Against Live Legal Databases
- LexML API for legislation status
- Congresso Nacional API for ratification tracking
- Receita Federal portal for Soluções de Consulta

### Phase 2: Audit Agent
- Second AI reviews first AI's output
- Checks: calculation accuracy, legal citations, anachronisms, completeness

### Phase 3: Tax Calculation Engine
- Deterministic calculation (not probabilistic LLM math)
- Export: PIS/COFINS/ISS/IRRF/IRPJ/CSLL
- Reform transition: IBS/CBS 2026-2033

### Phase 4: Chain-of-Thought Reasoning
- Force hierarchy analysis before conclusions
- Few-shot examples from real opinions
- Nature-of-service determination step

### Phase 5: Reform Readiness (IBS/CBS)
- LC 214/2025 provisions
- Transition timeline alerts
- Consumption-based export immunity
