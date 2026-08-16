import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
});

// Endpoint: AI Food Image Recognition & Macro Breakdown
app.post('/api/ai/scan-food', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', promptContext } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 data' });
    }

    // Clean base64 string if data URL prefix was sent
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // In case json wrapping has markdown ticks
      const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error in /api/ai/scan-food:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze food image with Gemini AI',
    });
  }
});

// Endpoint: AI Smart Meal Assistant & Recipe Formulation
app.post('/api/ai/nutrition-advisor', async (req, res) => {
  try {
    const { query, dailySummary, macroGoals, userProfile } = req.body;

    const prompt = `You are MacroPulse AI, an elite sports nutritionist and registered dietitian.
User Context:
- Target Goals: ${JSON.stringify(macroGoals || {})}
- Consumed Today: ${JSON.stringify(dailySummary || {})}
- User Profile: ${JSON.stringify(userProfile || {})}

User Question/Request: "${query}"

Provide actionable, mathematically sound nutritional guidance, suggested foods with exact gram portions to hit remaining macros, or recipe advice. Keep it concise, motivating, and highly structured with bullet points.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    });

    res.json({ success: true, answer: response.text });
  } catch (error: any) {
    console.error('Error in /api/ai/nutrition-advisor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve static frontend files in production if dist exists
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

app.listen(PORT, () => {
  console.log(`MacroPulse server running on port ${PORT}`);
});
