# Brazilian OSINT Registries — Detailed Reference

## CNPJ Lookup (Free)

### ReceitaWS API
```
GET https://receitaws.com.br/v1/cnpj/{CNPJ_14_DIGITS}
```
No auth. Rate: 3/min. Returns JSON:
- `nome`, `fantasia` — company name
- `abertura` — founding date
- `situacao` — ATIVA/BAIXADA/SUSPENSA
- `tipo` — MATRIZ/FILIAL
- `porte` — MICRO EMPRESA/EMPRESA DE PEQUENO PORTE/DEMAIS
- `capital_social` — declared capital (R$)
- `natureza_juridica` — 213-5=Individual, 206-2=LTDA, 223-2=Sociedade Simples
- `logradouro`, `numero`, `complemento`, `bairro`, `municipio`, `uf`, `cep`
- `email`, `telefone`
- `atividade_principal` — CNAE code + description
- `atividades_secundarias` — additional activities
- `qsa` — partner list (name + role code)

### QSA Role Codes
- 49: Sócio-Administrador (managing partner)
- 22: Sócio (partner)
- 05: Administrador (administrator)
- 10: Diretor (director)
- 16: Presidente (president)

### Alternative CNPJ Sources
- cnpj.biz/{CNPJ} — basic info, free
- cnpja.com/office/{CNPJ} — more detail
- empresas.serasaexperian.com.br/consulta-gratis/{CNPJ} — Serasa free tier
- econodata.com.br/consulta-empresa/{CNPJ} — often blocked from server IPs
- advdinamico.com.br/empresas/{CNPJ} — good for law firms, shows partners

### CPF Exposure
Sometimes the CNPJ `nome` field for individual companies (MEI/ME) includes the CPF number. This is a data leak from Receita Federal. Format: `FULL NAME CPF_11_DIGITS`

## Phone Number Format (Brazil)
- Mobile: (XX) 9XXXX-XXXX (9 digits, starts with 9)
- Landline: (XX) XXXX-XXXX (8 digits)
- Area codes: 11=SP, 21=RJ, 41=Curitiba, 47=Joinville, 48=Florianópolis, 49=Xanxerê/Chapecó/Curitibanos (SC interior)
- Landlines are significant: tied to physical addresses in telecom records

## Business Types
- MEI: Microempreendedor Individual (max R$81K/yr revenue)
- ME: Microempresa (max R$360K/yr)
- EPP: Empresa de Pequeno Porte (max R$4.8M/yr)
- LTDA: Sociedade Limitada (requires 2+ partners)
- S/A: Sociedade Anônima (corporation)

## Court Systems
- TJPR: Tribunal de Justiça do Paraná (portal.tjpr.jus.br)
- TJSC: Tribunal de Justiça de Santa Catarina
- TRF4: Tribunal Regional Federal 4ª Região (PR/SC/RS)
- Search by party name or process number

## Property
- Cartório de Registro de Imóveis: by district, ~R$60/certificate
- registradores.onr.org.br: online property search
- IPTU: municipal property tax (sometimes searchable online)
- INCRA/SIGEF: rural land (sigef.incra.gov.br)
- CAR: environmental rural registry (car.gov.br)

## Genealogy
- FamilySearch.org: Brazilian civil/church records (free)
- Immigration records: centrogalmozzi.it for Italian immigrants
- Italian surnames in SC: Pellizzaro, Vedana, etc. = Veneto region
- German surnames in SC: common in Blumenau/Joinville area

## Neighborhood Wealth Tiers (Curitiba)
Luxury: Batel, Bigorrilho/Champagnat, Ecoville, Água Verde, Cabral
Upper-middle: Boa Vista, Juvevê, Alto da XV, Mercês
Middle: Portão, Hauer, Xaxim, Capão Raso
Lower: Cidade Industrial, Sítio Cercado, Tatuquara
