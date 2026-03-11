# Bot Triagem Gestacional — Plano MVP

**Versão:** 1.0  
**Data:** Junho 2025  
**Mercado:** Brasil  
**Idioma:** Português (BR)

---

## 1. Visão Geral do Produto

### O que é
Um chatbot de acompanhamento gestacional via WhatsApp que oferece suporte educacional e monitoramento de sintomas semana a semana, da 1ª à 40ª semana de gravidez.

### O que NÃO é
- **Não é diagnóstico médico** — é suporte educacional
- **Não substitui pré-natal** — complementa o acompanhamento
- **Não prescreve medicamentos** — orienta buscar profissional

### Proposta de Valor
> "Sua companheira de gravidez 24/7 — informação confiável, check-ins diários e alertas inteligentes para uma gestação mais tranquila."

---

## 2. Escopo MVP (v1)

### ✅ Incluído no MVP

| Feature | Descrição |
|---------|-----------|
| **Onboarding** | Cadastro com DUM/DPP, dados básicos, consentimento LGPD |
| **Acompanhamento Semanal** | Conteúdo educacional da semana atual (desenvolvimento do bebê, mudanças no corpo) |
| **Check-in Diário** | Questionário rápido de sintomas (5-7 perguntas) |
| **Sistema de Alertas** | Triagem de sintomas com 3 níveis (verde/amarelo/vermelho) |
| **Relatório Mensal** | PDF resumido para levar à consulta |
| **FAQ Contextual** | Respostas às dúvidas mais comuns por semana |

### ❌ Fora do MVP (v2+)

- Integração com wearables
- Comunidade/fórum entre gestantes
- Telemedicina integrada
- Acompanhamento pós-parto
- Prontuário eletrônico integrado
- App nativo

---

## 3. Fluxo do Usuário

### 3.1 Onboarding (Primeira Interação)

```
[Gestante envia "Oi" ou clica em link da clínica]
        ↓
[Bot] "Olá! 👋 Sou a Gesta, sua companheira de gestação.
       Vou te acompanhar semana a semana com informações
       e check-ins diários. Vamos começar?"
        ↓
[Coleta de Dados - 5 telas]
  1. Nome
  2. Data da Última Menstruação (DUM) ou DPP conhecida
  3. Primeira gestação? (Sim/Não)
  4. Tem acompanhamento pré-natal? (Sim/Não)
  5. Consentimento LGPD (obrigatório)
        ↓
[Bot] "Perfeito, [Nome]! Você está na semana [X].
       Seu bebê agora tem o tamanho de uma [fruta].
       Amanhã às 9h te mando seu primeiro check-in! 💜"
```

### 3.2 Uso Diário

```
[09:00] Bot envia check-in diário
        ↓
"Bom dia, [Nome]! Como você está hoje?"
  □ Ótima
  □ Bem
  □ Mais ou menos
  □ Não muito bem
        ↓
[Perguntas de sintomas - baseadas na semana]
  - Enjoo/náusea?
  - Dor de cabeça?
  - Sangramento?
  - Contrações?
  - Pressão alta conhecida?
  - Inchaço anormal?
  - Movimentação do bebê? (após 20 semanas)
        ↓
[Análise automática → Classificação]
```

### 3.3 Sistema de Alertas (Triagem)

| Nível | Cor | Ação | Exemplos |
|-------|-----|------|----------|
| **Normal** | 🟢 Verde | Orientação + conteúdo educativo | Enjoo leve, cansaço, azia |
| **Atenção** | 🟡 Amarelo | Sugere contato com médico em 24-48h | Dor de cabeça persistente, inchaço moderado |
| **Urgência** | 🔴 Vermelho | Orienta buscar pronto-socorro IMEDIATAMENTE | Sangramento, perda de líquido, ausência de movimentos fetais, pressão >140/90 |

**Fluxo de Alerta Vermelho:**
```
[Sintoma crítico detectado]
        ↓
[Bot] "⚠️ [Nome], este sintoma precisa de atenção
       médica URGENTE. Por favor, vá ao pronto-socorro
       ou ligue para seu médico AGORA.
       
       📞 SAMU: 192
       
       Posso te ajudar com mais alguma coisa?"
        ↓
[Notificação para clínica/enfermeira parceira - se configurado]
```

### 3.4 Conteúdo Semanal

```
[Segunda-feira, 08:00]
        ↓
"🎉 [Nome], você entrou na semana [X]!

👶 Seu bebê:
[Tamanho comparativo com fruta]
[Desenvolvimento desta semana]

🤰 Seu corpo:
[O que pode esperar]
[Sintomas comuns]

💡 Dica da semana:
[Orientação prática]

Tem alguma dúvida? Me pergunta!"
```

### 3.5 Relatório para Consulta

```
[Gerado automaticamente ou sob demanda]
        ↓
📋 RELATÓRIO GESTACIONAL
Nome: [Nome]
Semanas: [X] a [Y]
Período: [Data início] - [Data fim]

SINTOMAS REPORTADOS:
- Enjoo: 8 dias (leve)
- Dor de cabeça: 2 dias
- Nenhum alerta vermelho

HUMOR GERAL:
- Ótima: 12 dias
- Bem: 10 dias
- Mais ou menos: 5 dias

OBSERVAÇÕES:
[Notas relevantes]

⚠️ Este relatório é informativo e não substitui avaliação médica.
```

---

## 4. Stack Tecnológica Recomendada

### WhatsApp Business API (Obrigatório para Brasil)

**Por que WhatsApp:**
- 99% de penetração no Brasil
- Familiar para todas as faixas etárias
- Notificações nativas
- Não requer download de novo app

**Opções de Provedor:**

| Provedor | Custo/mês | Prós | Contras |
|----------|-----------|------|---------|
| **Twilio** | ~R$500 + mensagens | Robusto, boa doc | Mais caro |
| **Meta Cloud API** | Grátis + mensagens | Direto da fonte | Setup mais complexo |
| **Take Blip** | Sob consulta | BR-based, suporte PT | Vendor lock-in |
| **Zenvia** | ~R$300 + mensagens | BR-based | Menos features |

**Recomendação MVP:** Meta Cloud API + servidor próprio (menor custo)

### Arquitetura Sugerida

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  WhatsApp   │────▶│   Webhook   │────▶│   Backend   │
│   (User)    │◀────│   Handler   │◀────│   (Node.js) │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
             ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
             │  Database   │           │   Content   │           │    PDF      │
             │ (PostgreSQL)│           │    (JSON)   │           │  Generator  │
             └─────────────┘           └─────────────┘           └─────────────┘
```

### Stack Detalhada

| Componente | Tecnologia | Custo Mensal |
|------------|------------|--------------|
| **Servidor** | Railway / Render / DigitalOcean | R$50-150 |
| **Banco de Dados** | PostgreSQL (Supabase free tier) | R$0-50 |
| **WhatsApp API** | Meta Cloud API | ~R$0.30/conversa |
| **Agendador** | Node-cron ou BullMQ | Incluído |
| **PDF** | Puppeteer ou jsPDF | Incluído |
| **Monitoramento** | Sentry (free tier) | R$0 |

**Custo infra estimado:** R$100-300/mês para até 500 usuárias

---

## 5. Estrutura de Conteúdo

### 5.1 Template Semanal (40 semanas)

```json
{
  "semana": 12,
  "trimestre": 1,
  "bebe": {
    "tamanho_cm": 5.4,
    "peso_g": 14,
    "comparacao": "limão",
    "desenvolvimento": [
      "Reflexos começam a se desenvolver",
      "Unhas começam a crescer",
      "Sistema digestivo pratica movimentos"
    ]
  },
  "mae": {
    "sintomas_comuns": [
      "Enjoo começando a diminuir",
      "Mais energia",
      "Possível dor no ligamento redondo"
    ],
    "mudancas_corpo": [
      "Útero começa a sair da pelve",
      "Barriga pode começar a aparecer"
    ]
  },
  "dica_semana": "Este é um bom momento para começar exercícios leves como caminhada ou yoga pré-natal.",
  "checkin_sintomas": [
    "enjoo",
    "fadiga",
    "dor_cabeca",
    "sangramento",
    "dor_abdominal"
  ],
  "alertas_especificos": [
    {
      "sintoma": "sangramento",
      "nivel": "vermelho",
      "mensagem": "Sangramento no primeiro trimestre precisa de avaliação médica urgente."
    }
  ],
  "faq": [
    {
      "pergunta": "Posso pintar o cabelo?",
      "resposta": "A partir do segundo trimestre, tinturas sem amônia são consideradas seguras. Consulte seu médico."
    }
  ],
  "exames_sugeridos": [
    "Ultrassom morfológico de 1º trimestre",
    "NIPT (se indicado)",
    "Exames de sangue de rotina"
  ]
}
```

### 5.2 Matriz de Sintomas (Triagem)

```json
{
  "sintomas": {
    "sangramento": {
      "1_trimestre": "vermelho",
      "2_trimestre": "vermelho",
      "3_trimestre": "vermelho",
      "mensagem_vermelho": "Sangramento em qualquer fase da gestação requer avaliação médica imediata."
    },
    "enjoo": {
      "1_trimestre": "verde",
      "2_trimestre": "amarelo",
      "3_trimestre": "amarelo",
      "mensagem_verde": "Enjoo é comum no primeiro trimestre. Tente comer pequenas porções.",
      "escala_gravidade": {
        "leve": "verde",
        "moderado": "verde",
        "severo_com_vomito_constante": "amarelo",
        "nao_consegue_manter_liquidos": "vermelho"
      }
    },
    "dor_cabeca": {
      "padrao": "amarelo",
      "com_visao_turva": "vermelho",
      "com_pressao_alta": "vermelho"
    },
    "contrações": {
      "antes_37_semanas": "vermelho",
      "apos_37_semanas_irregulares": "amarelo",
      "apos_37_semanas_regulares": "vermelho"
    },
    "ausencia_movimento_fetal": {
      "apos_28_semanas": "vermelho",
      "mensagem": "Se não sentir o bebê mexer por mais de 2 horas, vá ao hospital."
    }
  }
}
```

### 5.3 Necessidade de Conteúdo

| Tipo | Quantidade | Responsável |
|------|------------|-------------|
| Textos semanais | 40 | Enfermeira + Revisão médica |
| Sintomas mapeados | ~50 | Enfermeira + Revisão médica |
| FAQs | ~200 (5/semana) | Enfermeira |
| Mensagens de alerta | ~30 | Revisão médica obrigatória |
| Dicas diárias | ~280 (7/semana) | Enfermeira |

---

## 6. Monetização

### Modelo Recomendado: Híbrido B2B2C

```
┌────────────────────────────────────────────────────────────┐
│                    MODELO DE RECEITA                        │
├─────────────────────┬──────────────────────────────────────┤
│ B2B (Clínicas)      │ R$500-2.000/mês por clínica          │
│                     │ - Marca branca (white-label)          │
│                     │ - Dashboard de pacientes              │
│                     │ - Alertas para equipe médica          │
│                     │ - Relatórios consolidados             │
├─────────────────────┼──────────────────────────────────────┤
│ B2C (Direto)        │ R$29-49/mês por gestante             │
│                     │ - Versão "premium" individual         │
│                     │ - Para quem não tem via clínica       │
├─────────────────────┼──────────────────────────────────────┤
│ Freemium (Captação) │ Grátis - conteúdo semanal básico     │
│                     │ - Pago - check-ins + alertas          │
└─────────────────────┴──────────────────────────────────────┘
```

### Projeção Financeira (12 meses)

**Cenário Conservador:**

| Mês | Clínicas (B2B) | Gestantes (B2C) | Receita Mensal |
|-----|----------------|-----------------|----------------|
| 1-3 | 2 | 20 | R$2.000 + R$800 = R$2.800 |
| 4-6 | 5 | 50 | R$5.000 + R$2.000 = R$7.000 |
| 7-9 | 10 | 100 | R$10.000 + R$4.000 = R$14.000 |
| 10-12 | 15 | 150 | R$15.000 + R$6.000 = R$21.000 |

**Break-even:** ~Mês 5 (considerando custo de R$5.000/mês)

### Estratégia de Entrada via Parceira

```
[Enfermeira Parceira]
        │
        ├── Já tem relacionamento com clínicas
        ├── Credibilidade profissional
        ├── Conhece as dores do mercado
        │
        ▼
[Modelo de Comissão]
  - 20-30% da receita das clínicas que ela trouxer
  - Ou salário fixo + bônus por meta
  - Equity se for sócia
```

---

## 7. Cronograma de Desenvolvimento

### Fase 1: Fundação (Semanas 1-4)

| Semana | Entrega |
|--------|---------|
| 1 | Setup WhatsApp Business API, servidor, banco de dados |
| 2 | Fluxo de onboarding completo |
| 3 | Sistema de check-in diário básico |
| 4 | Conteúdo das semanas 1-20 |

### Fase 2: Core Features (Semanas 5-8)

| Semana | Entrega |
|--------|---------|
| 5 | Sistema de alertas (triagem) |
| 6 | Conteúdo das semanas 21-40 |
| 7 | Gerador de relatório PDF |
| 8 | FAQ contextual |

### Fase 3: Polish & Launch (Semanas 9-12)

| Semana | Entrega |
|--------|---------|
| 9 | Testes com beta testers (5-10 gestantes) |
| 10 | Ajustes baseados em feedback |
| 11 | Dashboard básico para clínicas |
| 12 | Lançamento soft (1-2 clínicas piloto) |

### Estimativa de Custos de Desenvolvimento

| Item | Custo |
|------|-------|
| **Desenvolvimento (3 meses)** | R$15.000-30.000 |
| - Freelancer júnior | R$15.000 |
| - Freelancer sênior | R$30.000 |
| - Agência | R$50.000+ |
| **Conteúdo (40 semanas)** | R$5.000-10.000 |
| - Enfermeira parceira (equity) | R$0 |
| - Freelancer saúde | R$5.000-10.000 |
| **Revisão Médica** | R$2.000-5.000 |
| **Design/UX** | R$3.000-5.000 |
| **Infra (3 meses)** | R$500-1.000 |
| **Jurídico (LGPD + Termos)** | R$2.000-5.000 |
| **TOTAL MVP** | **R$25.000-55.000** |

### Opção Low-Cost

Se a enfermeira parceira criar o conteúdo e um dev júnior/pleno desenvolver:

| Item | Custo |
|------|-------|
| Desenvolvimento | R$15.000 |
| Conteúdo | R$0 (parceira) |
| Revisão médica | R$2.000 |
| Jurídico | R$2.000 |
| Infra | R$500 |
| **TOTAL** | **R$19.500** |

---

## 8. Compliance e Aspectos Legais

### 8.1 LGPD (Lei Geral de Proteção de Dados)

**Dados Sensíveis:** Dados de saúde são considerados **dados sensíveis** pela LGPD.

**Requisitos Obrigatórios:**

| Requisito | Implementação |
|-----------|---------------|
| **Consentimento explícito** | Opt-in claro no onboarding com texto completo |
| **Finalidade específica** | Explicar exatamente para que os dados serão usados |
| **Direito de acesso** | Comando "/meusdados" para exportar |
| **Direito de exclusão** | Comando "/excluirconta" para deletar tudo |
| **Minimização** | Coletar apenas o necessário |
| **Segurança** | Criptografia em trânsito e repouso |

**Texto de Consentimento (modelo):**
```
Para usar o Bot Triagem Gestacional, preciso coletar alguns dados:

📋 O que coletamos:
- Seu nome e telefone
- Data da última menstruação
- Respostas dos check-ins diários
- Histórico de sintomas

🎯 Para que usamos:
- Enviar conteúdo personalizado da sua semana
- Gerar alertas se algo precisar de atenção
- Criar relatórios para suas consultas

🔒 Seus direitos:
- Acessar seus dados a qualquer momento
- Pedir exclusão completa
- Seus dados nunca serão vendidos

Você concorda? (Sim/Não)
```

### 8.2 Responsabilidade Médica

**⚠️ IMPORTANTE: O bot NÃO faz diagnóstico.**

**Disclaimers Obrigatórios:**

1. **No onboarding:**
> "Este serviço é educacional e não substitui o acompanhamento médico. Sempre siga as orientações do seu obstetra."

2. **Em todo alerta vermelho:**
> "Esta orientação é baseada em protocolos gerais. Procure atendimento médico para avaliação adequada."

3. **Nos relatórios:**
> "Este relatório é informativo. Não constitui diagnóstico ou prescrição médica."

**Estrutura Legal Recomendada:**

```
┌─────────────────────────────────────────────────────────────┐
│                  ESTRUTURA DE PROTEÇÃO                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Termos de Uso claros (não é serviço médico)              │
│ 2. Conteúdo revisado por médico (documentado)               │
│ 3. Disclaimers em pontos críticos                           │
│ 4. Orientação sempre para buscar médico                     │
│ 5. Registro de todas as interações (auditoria)              │
│ 6. Seguro de responsabilidade civil (recomendado)           │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Registro e Regulamentação

| Órgão | Necessidade | Observação |
|-------|-------------|------------|
| ANVISA | Não (provavelmente) | Não é dispositivo médico se não diagnostica |
| CFM/COFEN | Não | Mas conteúdo deve ser revisado por profissional |
| CNPJ | Sim | Empresa regular |
| Contrato com clínicas | Sim | Definir responsabilidades |

**Consultar advogado de saúde digital** antes do lançamento comercial.

---

## 9. Métricas de Sucesso (KPIs)

### Engajamento

| Métrica | Meta MVP | Meta 6 meses |
|---------|----------|--------------|
| Taxa de conclusão onboarding | >80% | >90% |
| Check-ins respondidos/semana | >4 | >5 |
| Retenção 30 dias | >60% | >75% |
| NPS | >40 | >50 |

### Negócio

| Métrica | Meta MVP | Meta 6 meses |
|---------|----------|--------------|
| Custo por aquisição (CAC) | <R$50 | <R$30 |
| Lifetime Value (LTV) | R$250 | R$350 |
| Churn mensal | <15% | <10% |
| Clínicas ativas | 3 | 15 |

### Saúde (Impacto)

| Métrica | Meta |
|---------|------|
| Alertas vermelhos → ida ao médico | >90% |
| Relatórios baixados | >50% das usuárias |
| Satisfação com conteúdo | >4/5 estrelas |

---

## 10. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Responsabilidade por diagnóstico errado | Média | Alto | Disclaimers + nunca diagnosticar |
| WhatsApp bloquear número | Baixa | Alto | Seguir políticas Meta, número verificado |
| Baixo engajamento | Média | Médio | Gamificação, lembretes inteligentes |
| Conteúdo desatualizado | Média | Médio | Revisão semestral por profissional |
| Competidor maior | Alta | Médio | Diferenciação por parceria com clínicas |
| Custo de mensagens escalar | Média | Baixo | Modelo de pricing que cubra custos |

---

## 11. Próximos Passos Imediatos

### Semana 0 (Preparação)

- [ ] Definir sociedade/parceria com enfermeira
- [ ] Escolher nome definitivo do bot
- [ ] Registrar domínio e marca
- [ ] Criar conta WhatsApp Business

### Semana 1 (Kick-off)

- [ ] Setup técnico inicial
- [ ] Início da produção de conteúdo (semanas 1-10)
- [ ] Wireframes das conversas
- [ ] Contato com advogado para LGPD

### Semana 2-4 (Desenvolvimento)

- [ ] Desenvolvimento do core do bot
- [ ] Conteúdo semanas 11-40
- [ ] Revisão médica do conteúdo
- [ ] Testes internos

---

## 12. Apêndice: Exemplo de Conversa

```
[09:00 - Bot]
Bom dia, Maria! ☀️ Como você está hoje?

[Botões]
😊 Ótima
🙂 Bem  
😐 Mais ou menos
😔 Não muito bem

[Maria clica: Mais ou menos]

[Bot]
Entendi. Vamos ver como posso ajudar.
Você está sentindo algum desses sintomas?

[Botões múltipla escolha]
□ Enjoo
□ Dor de cabeça
□ Cansaço
□ Dor nas costas
□ Nenhum desses

[Maria seleciona: Dor de cabeça]

[Bot]
Dor de cabeça pode ser comum na gestação, 
especialmente por mudanças hormonais.

Mais uma pergunta: A dor é acompanhada de:
□ Visão turva ou pontinhos
□ Pressão alta (se souber)
□ Nenhum desses

[Maria seleciona: Nenhum desses]

[Bot]
🟢 Tudo indica que é uma dor de cabeça comum.

💡 Dicas que podem ajudar:
- Descanse em ambiente escuro
- Beba bastante água
- Aplique compressa fria na testa
- Evite telas por um tempo

Se a dor persistir por mais de 24h ou piorar,
entre em contato com seu médico.

Deseja receber a dica do dia? (Sim/Não)
```

---

## Conclusão

O Bot Triagem Gestacional tem potencial significativo no mercado brasileiro devido a:

1. **Alta penetração do WhatsApp** — canal natural
2. **Carência de acompanhamento entre consultas** — gap real
3. **Parceira estratégica** — enfermeira com network de clínicas
4. **Modelo B2B2C** — múltiplas fontes de receita
5. **Custo de desenvolvimento acessível** — MVP sub R$25k possível

**Recomendação:** Iniciar com MVP enxuto, validar com 2-3 clínicas piloto, iterar baseado em feedback antes de escalar.

---

*Documento preparado para planejamento de MVP. Consulte profissionais de saúde e jurídico antes da implementação.*
