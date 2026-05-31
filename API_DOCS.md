# Carbonato Proxy API - Technical Documentation for AI Agents

## Base URL
`https://carbonato-proxy.vercel.app`

## Authentication
No global auth required. Individual models may require provider-specific tokens via environment variables:
- `ZYDIT_TOKEN` - For Zydit models (modelo4, modelo6, modelo7, modelo8, modelo9)
- `GITHUB_TOKEN` - For usage persistence (optional)

## Available Models

### modelo1: Kilo/OpenRouter
- **Endpoint**: `/chat/completions`
- **Model ID**: `openrouter/owl-alpha`
- **Provider**: Kilo AI Gateway (FREE)
- **Usage**: `{ "model": "modelo1", "messages": [...] }`
- **Notes**: No API key required, rate limited

### modelo2: Kilo/Llama Laguna
- **Model ID**: `poolside/laguna-xs.2-20260421:free`
- **Provider**: Kilo AI Gateway (FREE)
- **Usage**: `{ "model": "modelo2", "messages": [...] }`

### modelo3: Kilo/Nemotron
- **Model ID**: `nvidia/nemotron-3-super-120b-a12b:free`
- **Provider**: Kilo AI Gateway (FREE)
- **Usage**: `{ "model": "modelo3", "messages": [...] }`

### modelo4: Zydit/Vision
- **Endpoint**: `https://api.zydit.in/v1/chat/completions`
- **Model ID**: `nvidia/llama-3.1-nemotron-nano-vl-8b-v1`
- **Token Env**: `ZYDIT_TOKEN`
- **Vision**: Base64 image support via `image_url` in messages
- **Usage**: `{ "model": "modelo4", "messages": [{"role":"user","content":[{"type":"text","content":"..."},{"type":"image_url","image_url":{"url":"data:image/png;base64,..."}}]}]}`

### modelo5: Pollinations/Image
- **Endpoint**: `https://image.pollinations.ai/prompt/`
- **Type**: Image generation
- **Usage**: `{ "model": "modelo5", "messages": [{"role":"user","content":"puppy playing in garden"}] }`
- **Response**: `{ "data": [{ "url": "https://image.pollinations.ai/..." }] }`

### modelo6: Zydit/z-ai/glm5.1-reasoning
- **Model ID**: `moonshotai/kimi-k2.6`
- **Token Env**: `ZYDIT_TOKEN`

### modelo7: Zydit/GPT-OSS-120B
- **Model ID**: `openai/gpt-oss-120b`
- **Token Env**: `ZYDIT_TOKEN`

### modelo8: Zydit/Qwen 3.5
- **Model ID**: `qwen/qwen3.5-397b-a17b`
- **Token Env**: `ZYDIT_TOKEN`

## Rate Limits
- Kilo models: ~60 requests/minute
- Zydit models: Provider-dependent
- Pollinations: No hard limit

## Error Handling
- 400: Invalid request/model not configured
- 401: Missing/invalid provider token
- 500: Upstream provider error

## Environment Setup for Vercel
Environment Variables:
```
ZYDIT_TOKEN=zyd_live_9B4Jq6J-dsx8f8OfoKvZqSXFhgaXbaHqQKZMs90ZeQA
GITHUB_TOKEN=<your-github-token>
```

## Admin Panel
URL: `/api/admin-panel`
Access: Cookie `admin_sess=ok`
Features: View/edit model configs, test models, view usage stats