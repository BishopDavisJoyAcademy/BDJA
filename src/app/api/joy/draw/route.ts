import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { chatWithJoy } from "@/lib/aevibron";

export const dynamic = "force-dynamic";

interface DrawBody {
  prompt: string;
  canvasWidth: number;
  canvasHeight: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const body = (await req.json()) as DrawBody;
    const { prompt, canvasWidth, canvasHeight } = body;

    if (!prompt || !canvasWidth || !canvasHeight) {
      return NextResponse.json({ error: "prompt, canvasWidth, and canvasHeight are required" }, { status: 400 });
    }

    const systemPrompt = `You are an AI drawing assistant. Given a user description, generate a JSON array of drawing strokes that will render the described image on a ${canvasWidth}x${canvasHeight} canvas.

RULES:
- Return ONLY valid JSON. No markdown, no explanations.
- The JSON must have this exact structure: {"strokes": [{"points": [{"x": number, "y": number}, ...], "color": "#RRGGBB", "width": number}]}
- Use hex color codes.
- Stroke width should be between 1 and 8.
- Coordinates must be within 0 to ${canvasWidth} for x and 0 to ${canvasHeight} for y.
- Generate enough points per stroke to make curves smooth (at least 20-50 points for circles, 10-20 for straight lines).
- For text, draw each letter as a series of connected line segments.
- For shapes, trace the outline as a continuous stroke.
- Be creative but precise. The drawing should clearly match the user's description.
- If the user asks for something complex, simplify it to recognizable shapes.

EXAMPLE for a red circle in the center:
{"strokes": [{"points": [{"x":400,"y":200},{"x":380,"y":210},...{"x":400,"y":200}], "color": "#ef4444", "width": 3}]}`;

    const aiResponse = await chatWithJoy(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Canvas: ${canvasWidth}x${canvasHeight}. Draw: ${prompt}` },
      ],
      { userName: session.fullName || "User", userCategory: session.role || "student", personality: "creative" }
    );

    // Extract JSON from response
    let strokes: Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }> = [];
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        strokes = parsed.strokes || [];
      }
    } catch {
      // Fallback: try to parse the whole response
      try {
        const parsed = JSON.parse(aiResponse);
        strokes = parsed.strokes || [];
      } catch {
        return NextResponse.json({ error: "AI failed to generate valid drawing data" }, { status: 500 });
      }
    }

    // Validate and clamp coordinates
    const validatedStrokes = strokes.map((s) => ({
      points: s.points.map((p) => ({
        x: Math.max(0, Math.min(canvasWidth, Math.round(p.x))),
        y: Math.max(0, Math.min(canvasHeight, Math.round(p.y))),
      })),
      color: s.color || "#000000",
      width: Math.max(1, Math.min(8, s.width || 2)),
    }));

    return NextResponse.json({
      strokes: validatedStrokes,
      description: prompt,
    });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/draw] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to generate drawing" }, { status: 500 });
  }
}
