import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getConfiguredApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY' || key.length < 10) {
    return null;
  }
  return key;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/ai/status', (_req, res) => {
    const apiKey = getConfiguredApiKey();
    res.json({
      configured: Boolean(apiKey),
      model: 'gemini-4-hydrogen',
    });
  });

const ALLOWED_FLOOR_MATERIALS = [
  'white-oak',
  'herringbone-oak',
  'smoked-walnut',
  'polished-concrete',
  'warm-travertine',
  'polished-marble',
  'ceramic-tile',
  'plush-carpet',
] as const;

const ALLOWED_CEILING_TYPES = [
  'flat-plaster',
  'recessed-cove',
  'exposed-beams',
  'starry-cinema',
] as const;

const ALLOWED_LIGHTING_PRESETS = [
  'natural-daylight',
  'soft-morning',
  'golden-hour',
  'warm-evening',
  'night-ambient',
] as const;

function sanitizeShortText(value: unknown, fallback: string, maxLen = 120): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLen);
  return cleaned || fallback;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

  app.post('/api/ai/suggest', async (req, res) => {
    const apiKey = getConfiguredApiKey();
    if (!apiKey) {
      res.status(503).json({
        configured: false,
        error:
          'Gemini API key is not configured on this server. Add GEMINI_API_KEY in Settings > Secrets to enable live AI spatial planning, or apply a curated architectural preset.',
      });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const roomType = sanitizeShortText(body.roomType, 'Living Room', 48);
    const style = sanitizeShortText(body.style, 'Modern Luxury', 48);
    const colorPreference = sanitizeShortText(body.colorPreference, 'Warm Cream & Sand Beige', 80);
    const mood = sanitizeShortText(body.mood, 'Calm & Sunlit', 60);
    const designRequirements = sanitizeShortText(
      body.designRequirements,
      'Balanced seating circulation, natural daylight balance, and uncluttered storage',
      380,
    );

    const rawDims =
      body.dimensions && typeof body.dimensions === 'object' ? body.dimensions : {};
    const dimensions = {
      length: clampNumber((rawDims as Record<string, unknown>).length, 5.5, 2.4, 14),
      width: clampNumber((rawDims as Record<string, unknown>).width, 4.2, 2.4, 14),
      height: clampNumber((rawDims as Record<string, unknown>).height, 2.9, 2.2, 5.0),
    };

    const rawBudget = Number(body.budget);
    const budget =
      Number.isFinite(rawBudget) && rawBudget > 0
        ? clampNumber(rawBudget, 350000, 15000, 50000000)
        : undefined;

    interface SanitizedCatalogItem {
      itemId: string;
      name: string;
      category: string;
      width: number;
      depth: number;
      priceINR: number;
    }

    const rawCatalog: unknown[] = Array.isArray(body.catalogSummary) ? body.catalogSummary : [];
    const catalogSummary: SanitizedCatalogItem[] = rawCatalog
      .slice(0, 80)
      .map((entry: unknown): SanitizedCatalogItem => {
        const item = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
        return {
          itemId: sanitizeShortText(item.itemId, '', 64),
          name: sanitizeShortText(item.name, '', 80),
          category: sanitizeShortText(item.category, '', 40),
          width: clampNumber(item.width, 1, 0.1, 8),
          depth: clampNumber(item.depth, 1, 0.1, 8),
          priceINR: clampNumber(item.price, 15000, 500, 5000000),
        };
      })
      .filter((item: SanitizedCatalogItem) => item.itemId.length > 0);

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const halfL = Math.max(1.0, dimensions.length / 2 - 0.55);
      const halfW = Math.max(1.0, dimensions.width / 2 - 0.55);
      const budgetLine = budget
        ? `Target approximate furnishing budget: ₹${Math.round(budget).toLocaleString('en-IN')} INR. Keep the combined catalog item prices near or within this target whenever practical.`
        : 'No fixed budget cap specified; balance craftsmanship, Indian residential proportions, and restraint.';

      const prompt = `You are a senior architectural interior designer specializing in realistic residential spaces. Design a balanced 3D room layout for a ${roomType}.
Style: ${style}
Color preference: ${colorPreference}
Mood: ${mood}
Design requirements & user notes: ${designRequirements}
${budgetLine}
Room interior dimensions in meters: length (X axis) = ${dimensions.length.toFixed(2)}m (x from -${halfL.toFixed(2)} to +${halfL.toFixed(2)}), width (Z axis) = ${dimensions.width.toFixed(2)}m (z from -${halfW.toFixed(2)} to +${halfW.toFixed(2)}), ceiling height = ${dimensions.height.toFixed(2)}m.

Available catalog items with Indian market unit prices in INR (choose ONLY from these exact itemId values):
${JSON.stringify(catalogSummary)}

Return a cohesive interior design plan in Indian Rupees (INR / ₹) with:
1. wallColor (hex string), accentWallColor (hex string), ceilingColor (hex string)
2. floorMaterial (one of: ${ALLOWED_FLOOR_MATERIALS.join(', ')})
3. ceilingType (one of: ${ALLOWED_CEILING_TYPES.join(', ')})
4. lightingPreset (one of: ${ALLOWED_LIGHTING_PRESETS.join(', ')})
5. conceptTitle (short 3-5 word editorial title)
6. designRationale (2-3 concrete architectural sentences explaining the material palette, traffic flow, and lighting)
7. budgetNote (1 concise sentence explaining how the selected items and surfaces align with the INR target)
8. estimatedCostINR (realistic total INR estimate for furniture + basic room finishes)
9. colorCombinations (3 to 4 coordinated swatch items with role, name, and hex)
10. lightingRecommendations (concise 2-sentence practical guidance covering ambient + task lighting)
11. spaceOptimizationSuggestions (2 to 3 concise, actionable layout/clearance tips for these exact room dimensions)
12. furniture (5 to 9 well-spaced items placed inside x in [-${halfL.toFixed(2)}, ${halfL.toFixed(2)}] and z in [-${halfW.toFixed(2)}, ${halfW.toFixed(2)}], no overlapping, rotationY in radians such as 0, 1.57, 3.14, -1.57, plus harmonious primaryColor hex and secondaryColor hex).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an architectural interior designer producing physically accurate room layouts with clean spatial clearance, restrained warm neutral materials, and realistic Indian market INR catalog cost alignment.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conceptTitle: { type: Type.STRING },
              designRationale: { type: Type.STRING },
              budgetNote: { type: Type.STRING },
              estimatedCostINR: { type: Type.NUMBER },
              wallColor: { type: Type.STRING },
              accentWallColor: { type: Type.STRING },
              ceilingColor: { type: Type.STRING },
              floorMaterial: { type: Type.STRING },
              ceilingType: { type: Type.STRING },
              lightingPreset: { type: Type.STRING },
              lightingRecommendations: { type: Type.STRING },
              spaceOptimizationSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              colorCombinations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    role: { type: Type.STRING },
                    name: { type: Type.STRING },
                    hex: { type: Type.STRING },
                  },
                  required: ['role', 'name', 'hex'],
                },
              },
              furniture: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    itemId: { type: Type.STRING },
                    x: { type: Type.NUMBER },
                    z: { type: Type.NUMBER },
                    rotationY: { type: Type.NUMBER },
                    primaryColor: { type: Type.STRING },
                    secondaryColor: { type: Type.STRING },
                  },
                  required: ['itemId', 'x', 'z', 'rotationY', 'primaryColor'],
                },
              },
            },
            required: [
              'conceptTitle',
              'designRationale',
              'budgetNote',
              'estimatedCostINR',
              'wallColor',
              'accentWallColor',
              'ceilingColor',
              'floorMaterial',
              'ceilingType',
              'lightingPreset',
              'lightingRecommendations',
              'spaceOptimizationSuggestions',
              'colorCombinations',
              'furniture',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const validIds = new Set(catalogSummary.map((c) => c.itemId));
      const rawFurniture = Array.isArray(parsed.furniture) ? parsed.furniture : [];
      const sanitizedFurniture = rawFurniture
        .map((entry) => {
          const f = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null;
          if (!f || typeof f.itemId !== 'string' || (validIds.size > 0 && !validIds.has(f.itemId))) {
            return null;
          }
          return {
            itemId: f.itemId,
            x: Number(clampNumber(f.x, 0, -halfL, halfL).toFixed(2)),
            z: Number(clampNumber(f.z, 0, -halfW, halfW).toFixed(2)),
            rotationY: clampNumber(f.rotationY, 0, -Math.PI * 2, Math.PI * 2),
            primaryColor: sanitizeShortText(f.primaryColor, '#EAE4D8', 16),
            secondaryColor: sanitizeShortText(f.secondaryColor, '#6E5B4B', 16),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const safePlan = {
        conceptTitle: sanitizeShortText(parsed.conceptTitle, `${style} ${roomType}`, 80),
        designRationale: sanitizeShortText(parsed.designRationale, '', 600),
        budgetNote: sanitizeShortText(parsed.budgetNote, '', 300),
        estimatedCostINR: clampNumber(parsed.estimatedCostINR, budget ?? 350000, 10000, 50000000),
        wallColor: sanitizeShortText(parsed.wallColor, '#F4F0E8', 16),
        accentWallColor: sanitizeShortText(parsed.accentWallColor, '#E5DDD0', 16),
        ceilingColor: sanitizeShortText(parsed.ceilingColor, '#FAF8F4', 16),
        floorMaterial: ALLOWED_FLOOR_MATERIALS.includes(parsed.floorMaterial as typeof ALLOWED_FLOOR_MATERIALS[number])
          ? parsed.floorMaterial
          : 'white-oak',
        ceilingType: ALLOWED_CEILING_TYPES.includes(parsed.ceilingType as typeof ALLOWED_CEILING_TYPES[number])
          ? parsed.ceilingType
          : 'recessed-cove',
        lightingPreset: ALLOWED_LIGHTING_PRESETS.includes(parsed.lightingPreset as typeof ALLOWED_LIGHTING_PRESETS[number])
          ? parsed.lightingPreset
          : 'natural-daylight',
        lightingRecommendations: sanitizeShortText(parsed.lightingRecommendations, '', 500),
        spaceOptimizationSuggestions: Array.isArray(parsed.spaceOptimizationSuggestions)
          ? parsed.spaceOptimizationSuggestions
              .slice(0, 4)
              .map((s) => sanitizeShortText(s, '', 220))
              .filter(Boolean)
          : [],
        colorCombinations: Array.isArray(parsed.colorCombinations)
          ? parsed.colorCombinations.slice(0, 5).map((c) => {
              const obj = c && typeof c === 'object' ? (c as Record<string, unknown>) : {};
              return {
                role: sanitizeShortText(obj.role, 'Accent', 32),
                name: sanitizeShortText(obj.name, 'Warm Neutral', 40),
                hex: sanitizeShortText(obj.hex, '#D8C9B5', 16),
              };
            })
          : [],
        furniture: sanitizedFurniture,
      };

      res.json({ configured: true, plan: safePlan });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate design suggestion.';
      res.status(502).json({
        configured: true,
        error: `Gemini API request failed: ${message}`,
      });
    }
  });

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Livora studio server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Livora server:', err);
  process.exit(1);
});
