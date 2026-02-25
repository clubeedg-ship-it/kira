#!/bin/bash
# Brazilian CNPJ family sweep via ReceitaWS
# Usage: bash recon-cnpj-family.sh <cnpj1> <cnpj2> ...

echo "=== CNPJ Family Sweep ==="

for cnpj in "$@"; do
    echo ""
    echo "--- CNPJ: $cnpj ---"
    curl -s "https://receitaws.com.br/v1/cnpj/$cnpj" 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    if 'status' in d and d['status'] == 'ERROR':
        print(f\"  ERROR: {d.get('message','Unknown')}\")
        sys.exit(0)
    for k in ['nome','fantasia','abertura','situacao','tipo','porte','capital_social',
              'natureza_juridica','logradouro','numero','complemento','bairro',
              'municipio','uf','cep','email','telefone']:
        if k in d and d[k]:
            print(f'  {k}: {d[k]}')
    if 'atividade_principal' in d:
        for a in d['atividade_principal']:
            print(f\"  Activity: {a.get('text','')}\")
    if 'qsa' in d:
        for s in d['qsa']:
            print(f\"  Partner: {s.get('nome','')} | Role: {s.get('qual','')}\")
except Exception as e:
    print(f'  Parse error: {e}')
" 2>/dev/null
    sleep 25  # Rate limit: 3 requests/min
done

echo ""
echo "=== Sweep complete ==="
