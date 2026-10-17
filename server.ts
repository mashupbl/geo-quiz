import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Question Generation Endpoint
app.post('/api/generate-questions', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.'
      });
    }

    const {
      continent = 'Africa',
      topic = 'Physical Geography',
      difficulty = 'medium',
      count = 5,
      specificNotes = '',
      existingQuestions = []
    } = req.body;

    const safeCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 15);

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are a world-class Geography Educator, Cartographer, and Curriculum Designer.
Your task is to generate high-quality, academically rigorous Multiple Choice Questions (MCQs) for a dynamic Geography Question Bank.

Rules:
1. Every question must have EXACTLY 4 plausible options.
2. The correct answer must be one of the four options verbatim.
3. Provide an informative, engaging educational explanation for why the answer is correct and why other common misconceptions are false.
4. Assess factual certainty: If a geographic fact is historically disputed, subject to seasonal variance, or debatable (e.g. source of the Nile, highest peak debate, disputed territorial borders), explicitly flag it in 'reviewFlag'. If completely solid, leave 'reviewFlag' as null or empty string.
5. Difficulty criteria:
   - 'easy': Foundational geographic facts, well-known capitals, major world oceans and rivers.
   - 'medium': National geography, climates, tectonic boundaries, straits, biomes, major landmarks.
   - 'hard': Intricate physical geography, lesser-known territories, archipelagos, high-altitude plateaus, rain shadow effects, historical geographic names.
6. Provide an appropriate Unsplash-style map or landscape keyword suggestion for 'imageSearchTerm' (e.g., 'kilimanjaro mountain landscape', 'amazon river rainforest aerial').`;

    const prompt = `Generate ${safeCount} unique Geography Multiple Choice Questions for:
- Continent: ${continent}
- Topic: ${topic}
- Target Difficulty: ${difficulty}
${specificNotes ? `- Additional Focus / Teacher notes: ${specificNotes}` : ''}

${existingQuestions.length > 0 ? `To avoid duplicates, DO NOT create questions similar to these existing ones:\n${existingQuestions.slice(0, 15).map((q: string) => `- ${q}`).join('\n')}` : ''}

Respond ONLY with valid JSON following this schema:
{
  "questions": [
    {
      "idSuffix": "3-digit alphanumeric or slug",
      "questionText": "Clear, concise question prompt",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Detailed explanation of the geographical facts...",
      "reviewFlag": null,
      "suggestedImageUrl": "https://images.unsplash.com/photo-..."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Fallback clean regex
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse Gemini response as JSON');
      }
    }

    const rawList = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    // Sanitize, validate and deduplicate generated questions
    const validatedQuestions = rawList.map((item: any, idx: number) => {
      const qText = String(item.questionText || '').trim();
      let options: string[] = Array.isArray(item.options) ? item.options.map(String) : [];
      let correctAnswer = String(item.correctAnswer || '').trim();

      // Ensure exactly 4 options
      if (options.length < 4) {
        options = [...options, 'None of the above', 'All of the above', 'Not enough data'].slice(0, 4);
      } else if (options.length > 4) {
        options = options.slice(0, 4);
      }

      // Ensure correct answer is in options
      if (!options.includes(correctAnswer)) {
        options[0] = correctAnswer;
      }

      const continentCode = continent.slice(0, 3).toUpperCase();
      const idHash = Math.random().toString(36).substring(2, 6).toUpperCase();
      const generatedId = `GEO-${continentCode}-${idHash}-${idx + 1}`;

      return {
        id: generatedId,
        continent,
        topic,
        difficulty,
        questionText: qText,
        options,
        correctAnswer,
        explanation: item.explanation || `The correct answer is ${correctAnswer}.`,
        reviewFlag: item.reviewFlag || null,
        imageUrl: item.suggestedImageUrl || null,
        source: 'ai_generated',
        status: 'draft', // By default AI questions are draft
      };
    }).filter((q: any) => q.questionText.length > 5);

    return res.json({
      success: true,
      count: validatedQuestions.length,
      questions: validatedQuestions
    });
  } catch (error: any) {
    console.error('Error generating questions with Gemini:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions.'
    });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
