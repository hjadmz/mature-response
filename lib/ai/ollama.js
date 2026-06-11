// Ollama transport: model discovery and a single chat call. All network and
// error-classification concerns live here; orchestration lives in index.js.

// Override with OLLAMA_URL for a remote/relocated Ollama (e.g. another port,
// a home server). Default matches a standard local install.
const OLLAMA = process.env.OLLAMA_URL || 'http://localhost:11434';
const REQUEST_TIMEOUT_MS = 90000;

/**
 * List installed chat models (embedding models filtered out). Returns [] if
 * Ollama is unreachable so the UI can prompt the user to start it.
 */
export async function getAvailableModels() {
  try {
    const res = await fetch(`${OLLAMA}/api/tags`);
    if (!res.ok) throw new Error('Ollama not reachable');
    const data = await res.json();
    return (data.models || [])
      .filter((m) => !m.name.includes('embed'))
      .map((m) => ({ name: m.name, size: m.size, modified_at: m.modified_at }));
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error.message);
    return [];
  }
}

/**
 * One chat completion. Returns the raw content string, or throws an error whose
 * message is a stable code (MODEL_NOT_FOUND / MODEL_CRASH) the caller maps to
 * user guidance. Errors flagged `.fatal` should not be retried.
 */
export async function callModel({ model, systemPrompt, userPrompt, temperature }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: 800,                          // cap output → less memory, no runaway generation
        response_format: { type: 'json_object' }, // force well-formed JSON from Ollama
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const lower = errText.toLowerCase();
      if (res.status === 404 || lower.includes('not found')) {
        const e = new Error('MODEL_NOT_FOUND'); e.fatal = true; throw e;
      }
      // "model runner has unexpectedly stopped" = the model crashed, usually out
      // of memory (e.g. a 70b on a 16GB machine). Retrying just crashes it again.
      if (res.status === 500 || lower.includes('runner') || lower.includes('memory') || lower.includes('out of')) {
        const e = new Error('MODEL_CRASH'); e.fatal = true; throw e;
      }
      throw new Error(`Ollama API error (${res.status}): ${errText}`);
    }

    const response = await res.json();
    return response.choices[0].message.content.trim();
  } finally {
    clearTimeout(timer);
  }
}
