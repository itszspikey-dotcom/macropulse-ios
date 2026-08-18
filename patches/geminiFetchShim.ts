// Intercepts calls to the AI-Studio backend's /api/ai/* endpoints — which don't exist
// in this native/offline build, since there's no bundled server — and serves them via
// direct client-side Gemini calls instead (see ./services/geminiClient).
//
// Deliberately does NOT touch the UI components that call fetch(). AI Studio's sync
// overwrites the whole MacroPulse-X repo on every push, discarding any edits made
// directly to component files, so patching component internals would get silently
// reverted on the next sync. Intercepting at the fetch layer only depends on the
// request/response JSON contract for these two endpoints staying stable — a much
// smaller, more stable surface than the component internals, which have already
// changed shape once. If a future AI Studio edit changes that contract, the existing
// try/catch fallback in each modal (local fake-data / templated advice) keeps the app
// from crashing — it just silently loses real AI functionality until this shim is
// updated to match, rather than crashing or breaking the build.

import { scanFoodImage, getNutritionAdvice } from './services/geminiClient';

const originalFetch = window.fetch.bind(window);

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url === '/api/ai/scan-food' && init?.method === 'POST') {
    try {
      const body = JSON.parse((init.body as string) || '{}');
      const data = await scanFoodImage(body.imageBase64, body.mimeType || 'image/jpeg', body.promptContext || '');
      return jsonResponse({ success: true, data });
    } catch (e: any) {
      return jsonResponse({ success: false, error: e.message || 'Gemini scan failed' }, 500);
    }
  }

  if (url === '/api/ai/nutrition-advisor' && init?.method === 'POST') {
    try {
      const body = JSON.parse((init.body as string) || '{}');
      const answer = await getNutritionAdvice(
        body.query,
        body.history || [],
        body.dailySummary,
        body.macroGoals,
        body.userProfile
      );
      return jsonResponse({ success: true, answer });
    } catch (e: any) {
      return jsonResponse({ success: false, error: e.message || 'Gemini advisor failed' }, 500);
    }
  }

  return originalFetch(input, init);
};
