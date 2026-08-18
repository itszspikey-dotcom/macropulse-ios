// Direct client-side Gemini calls for the native (Capacitor) build, where there is
// no bundled backend to keep the API key server-side. The key is embedded into the
// app bundle at build time via VITE_GEMINI_API_KEY — acceptable for a personal
// sideload, but note it is extractable by anyone who inspects the compiled app.

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-3.7-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(contents: any[], responseMimeType?: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY in .env.local before building.');
  }

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      ...(responseMimeType ? { generationConfig: { responseMimeType } } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text =
    json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
  return text;
}

export async function scanFoodImage(
  imageBase64: string,
  mimeType: string,
  promptContext: string
): Promise<any> {
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const prompt = `You are an expert nutritional biochemist and food vision AI.
Analyze this meal/food image thoroughly and identify all distinct food items, dishes, ingredients, and portion sizes.
Estimate the realistic weight in grams (g) for each detected item, along with precise nutritional values scaled to that weight.

Important Guidelines:
1. Always calculate calories & macros mathematically:
   Calories = (weight_in_grams / 100) * calories_per_100g
   Protein = (weight_in_grams / 100) * protein_per_100g
   Carbs = (weight_in_grams / 100) * carbs_per_100g
   Fat = (weight_in_grams / 100) * fat_per_100g
2. Round total calories to whole integers, and macros (protein, carbs, fat, fiber) to 1 decimal place.
3. Provide confidence score (0.0 to 1.0) and helpful nutritional notes.
4. If contextual notes are provided: "${promptContext || 'None'}", take them into account.

Return STRICT JSON in the following exact schema:
{
  "meal_title": "String summary of the dish (e.g., Grilled Chicken Bowl with Brown Rice & Avocado)",
  "overall_description": "Brief description of the plate composition",
  "total_weight_g": 450,
  "total_calories": 580,
  "total_protein_g": 42.5,
  "total_carbs_g": 54.0,
  "total_fat_g": 18.2,
  "total_fiber_g": 7.5,
  "detected_items": [
    {
      "name": "Grilled Chicken Breast",
      "estimated_weight_g": 150,
      "serving_unit": "g",
      "calories": 248,
      "protein_g": 46.5,
      "carbs_g": 0.0,
      "fat_g": 5.4,
      "fiber_g": 0.0,
      "calories_per_100g": 165,
      "protein_per_100g": 31.0,
      "carbs_per_100g": 0.0,
      "fat_per_100g": 3.6,
      "fiber_per_100g": 0.0,
      "confidence": 0.95
    }
  ],
  "health_insights": ["High in lean protein", "Good complex carbohydrates source"],
  "allergens_or_notes": ["Gluten-Free", "Dairy-Free"]
}`;

  const text = await callGemini(
    [
      {
        role: 'user',
        parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }],
      },
    ],
    'application/json'
  );

  const responseText = text || '{}';
  try {
    return JSON.parse(responseText);
  } catch {
    const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

export async function getNutritionAdvice(
  query: string,
  dailySummary: any,
  macroGoals: any,
  userProfile: any
): Promise<string> {
  const prompt = `You are MacroPulse AI, an elite sports nutritionist and registered dietitian.
User Context:
- Target Goals: ${JSON.stringify(macroGoals || {})}
- Consumed Today: ${JSON.stringify(dailySummary || {})}
- User Profile: ${JSON.stringify(userProfile || {})}

User Question/Request: "${query}"

Provide actionable, mathematically sound nutritional guidance, suggested foods with exact gram portions to hit remaining macros, or recipe advice. Keep it concise, motivating, and highly structured with bullet points.`;

  return callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
}
