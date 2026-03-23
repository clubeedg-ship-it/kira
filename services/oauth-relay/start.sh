#!/bin/bash
# Load OpenRouter key from openclaw config file
export OPENROUTER_API_KEY=$(python3 -c "
import json
c = json.load(open('/home/adminuser/.openclaw/openclaw.json'))
print(c['models']['providers']['openrouter']['apiKey'])
" 2>/dev/null)
exec python3 /home/adminuser/kira/services/oauth-relay/relay.py
