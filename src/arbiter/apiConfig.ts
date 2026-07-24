export type ApiPresetId = 'openai' | 'groq' | 'openrouter' | 'ollama' | 'custom';

export interface ApiPreset {
  id: ApiPresetId;
  label: string;
  baseUrl: string;
  defaultModel: string;
  hint: string;
}

export const API_PRESETS: Record<ApiPresetId, ApiPreset> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    hint: 'Reliable JSON. Needs an OpenAI API key.',
  },
  groq: {
    id: 'groq',
    label: 'Groq (fast)',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    hint: 'Very low latency. Free tier available at console.groq.com.',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    hint: 'Many models behind one key. Use provider/model ids.',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    hint: 'Local server. No cloud key — leave API key blank or use ollama.',
  },
  custom: {
    id: 'custom',
    label: 'Custom endpoint',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    hint: 'Any OpenAI-compatible /v1/chat/completions endpoint.',
  },
};

export interface StoredApiConfig {
  preset: ApiPresetId;
  baseUrl: string;
  model: string;
  apiKey: string;
}

const KEY = 'promptforge.arbiter.api.v1';

export function loadApiConfig(): StoredApiConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredApiConfig>;
      const preset = (parsed.preset && API_PRESETS[parsed.preset]
        ? parsed.preset
        : 'groq') as ApiPresetId;
      const defaults = API_PRESETS[preset];
      return {
        preset,
        baseUrl: parsed.baseUrl?.trim() || defaults.baseUrl,
        model: parsed.model?.trim() || defaults.defaultModel,
        apiKey: parsed.apiKey ?? '',
      };
    }
  } catch {
    /* ignore */
  }
  const d = API_PRESETS.groq;
  return {
    preset: 'groq',
    baseUrl: d.baseUrl,
    model: d.defaultModel,
    apiKey: '',
  };
}

export function saveApiConfig(cfg: StoredApiConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function applyPreset(preset: ApiPresetId, prev: StoredApiConfig): StoredApiConfig {
  const p = API_PRESETS[preset];
  return {
    preset,
    baseUrl: p.baseUrl,
    model: p.defaultModel,
    apiKey: prev.apiKey,
  };
}

export function configLooksReady(cfg: StoredApiConfig): boolean {
  if (!cfg.baseUrl.trim() || !cfg.model.trim()) return false;
  // Ollama often needs no key
  if (cfg.preset === 'ollama') return true;
  return cfg.apiKey.trim().length > 0;
}
