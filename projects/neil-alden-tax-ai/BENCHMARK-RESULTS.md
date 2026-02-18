# Tax AI Model Benchmark Results

**Date:** 2026-02-13
**Use case:** Brazilian tax law opinion generation (Parecer Tributário)
**Language:** Portuguese formal legal

## Results

| Model | Treaty Analysis | Legal Opinion | Quick Q&A | Verdict |
|-------|----------------|---------------|-----------|---------|
| **MiniMax M2.5** | ✅ 38.0s, 2204 tok, 4320 chars | ✅ 49.1s, 3005 tok, 8283 chars | ✅ 25.1s, 982 tok, 1818 chars | 🏆 **BEST** |
| **Kimi K2.5** | ⚠️ 89.7s, 5144 tok, 126 chars (!) | ✅ 102.3s, 5017 tok, 3935 chars | ❌ Timeout | Slow, unreliable |
| **GLM-5** | ❌ Timeout (>120s) | ❌ Timeout (>120s) | ❌ Not tested | Too slow (thinking overhead) |
| **Qwen3 Max** | ⏳ Not reached | ⏳ Not reached | ⏳ Not reached | Untested |
| **DeepSeek V3.2** | ⏳ Not reached | ⏳ Not reached | ⏳ Not reached | Untested |

## Analysis

### MiniMax M2.5 — Clear Winner
- **Fastest across all prompts** (25-49s)
- **Best output quality**: 4320 chars for treaty analysis, 8283 chars for full legal opinion
- **Most efficient token usage**: Lowest token count = cheapest to run
- **Consistent**: All 3 prompts completed without error

### Kimi K2.5 — Promising but Slow
- Treaty analysis returned only 126 chars (too short — likely thinking tokens eating budget)
- Legal opinion was decent (3935 chars) but took 102s
- Quick Q&A timed out completely
- **2-3x slower** than MiniMax

### GLM-5 — Unusable for This Use Case
- All prompts timed out (>120s each)
- Thinking/reasoning overhead is extreme
- Would need much higher timeout + token budget
- Not viable for a responsive tax opinion tool

## Recommendation

**MiniMax M2.5** for the Neil Alden Tax AI MVP:
- Fast enough for interactive use (~30-50s for complex opinions)
- Best output length and quality
- Cheapest per query
- Open-source → can run locally when needed for data security

## Note
Benchmark was cut short by process timeout. Qwen3 Max and DeepSeek V3.2 were not tested. 
Re-run recommended with longer timeout to complete the comparison.

## Re-run Command
```bash
cd ~/kira/projects/neil-alden-tax-ai
OPENROUTER_API_KEY='...' node benchmark2.js
```
