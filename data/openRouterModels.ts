/** OpenRouter'da kullanılabilecek modeller (id = API'ye gönderilen model id) */
export interface OpenRouterModelOption {
  id: string;
  label: string;
  free?: boolean;
}

/** Ücretsiz modeller (OpenRouter free tier — günlük limit uygulanabilir) */
export const OPENROUTER_FREE_MODELS: OpenRouterModelOption[] = [
  { id: 'openrouter/free', label: '🆓 OpenRouter Free (otomatik seçim)', free: true },
  { id: 'arcee-ai/trinity-large-preview:free', label: '🆓 Arcee Trinity Large Preview', free: true },
  { id: 'openrouter/pony-alpha', label: '🆓 Pony Alpha', free: true },
  { id: 'stepfun/step-3.5-flash:free', label: '🆓 Step 3.5 Flash', free: true },
  { id: 'tngtech/deepseek-r1t2-chimera:free', label: '🆓 DeepSeek R1T2 Chimera', free: true },
  { id: 'z-ai/glm-4.5-air:free', label: '🆓 GLM 4.5 Air', free: true },
  { id: 'tngtech/deepseek-r1t-chimera:free', label: '🆓 DeepSeek R1T Chimera', free: true },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: '🆓 Nemotron 3 Nano 30B', free: true },
  { id: 'deepseek/deepseek-r1-0528:free', label: '🆓 DeepSeek R1 0528', free: true },
  { id: 'tngtech/tng-r1t-chimera:free', label: '🆓 TNG R1T Chimera', free: true },
  { id: 'openai/gpt-oss-120b:free', label: '🆓 GPT-OSS 120B', free: true },
  { id: 'openrouter/aurora-alpha', label: '🆓 Aurora Alpha', free: true },
  { id: 'qwen/qwen3-coder:free', label: '🆓 Qwen3 Coder 480B', free: true },
  { id: 'upstage/solar-pro-3:free', label: '🆓 Solar Pro 3', free: true },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: '🆓 Llama 3.3 70B', free: true },
  { id: 'arcee-ai/trinity-mini:free', label: '🆓 Arcee Trinity Mini', free: true },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', label: '🆓 Nemotron Nano 12B VL', free: true },
];

export const OPENROUTER_MODELS: OpenRouterModelOption[] = [
  ...OPENROUTER_FREE_MODELS,
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
  { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
  { id: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
  { id: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B' },
  { id: 'mistralai/mistral-large', label: 'Mistral Large' },
  { id: 'mistralai/mixtral-8x7b-instruct', label: 'Mixtral 8x7B' },
  { id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek Chat v3' },
  { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b', label: 'Hermes 3 405B' },
];

/** Varsayılan: ücretsiz otomatik seçim */
export const OPENROUTER_DEFAULT_MODEL_ID = 'openrouter/free';
