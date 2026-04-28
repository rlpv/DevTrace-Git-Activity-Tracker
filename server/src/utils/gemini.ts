const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_FALLBACK_MODELS = ['gemini-2.0-flash'];
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

function readGeminiConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    throw new Error('Gemini is not configured. Missing GEMINI_API_KEY.');
  }

  return { apiKey, model };
}

function readFallbackModels(primaryModel: string): string[] {
  const raw = process.env.GEMINI_FALLBACK_MODELS?.trim();
  const configured = raw
    ? raw.split(',').map((item) => item.trim()).filter(Boolean)
    : DEFAULT_FALLBACK_MODELS;
  return configured.filter((model) => model !== primaryModel);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateGeminiReport(prompt: string): Promise<string> {
  const { apiKey, model } = readGeminiConfig();
  const models = [model, ...readFallbackModels(model)];
  let lastError = 'Gemini request failed.';

  for (const currentModel of models) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as GeminiGenerateResponse;
      if (response.ok) {
        const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
        if (!text) {
          throw new Error('Gemini returned an empty report.');
        }
        return text;
      }

      lastError = data.error?.message || `Gemini request failed (${response.status}).`;
      const unsupportedModel =
        lastError.toLowerCase().includes('not found for api version') ||
        lastError.toLowerCase().includes('is not supported for generatecontent');
      if (unsupportedModel && attempt === 3 && currentModel === models[models.length - 1]) {
        lastError = `${lastError} Configure GEMINI_MODEL (and optional GEMINI_FALLBACK_MODELS) with models available to your key.`;
      }
      const retryable = RETRYABLE_STATUS.has(response.status);
      if (!retryable || attempt === 3) {
        break;
      }
      await sleep(400 * attempt);
    }
  }

  throw new Error(lastError);
}
