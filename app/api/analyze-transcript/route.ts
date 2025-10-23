import { NextRequest, NextResponse } from "next/server";
import { getEvaluationRubric } from "@/app/lib/promptLoader";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: "Invalid transcript format. Expected array of messages." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
    console.log(`Using OpenRouter model: ${model}`);

    // Load evaluation rubric from YAML config
    const evaluationRubric = getEvaluationRubric();
    if (!evaluationRubric) {
      return NextResponse.json(
        { error: "Evaluation rubric not found in configuration" },
        { status: 500 }
      );
    }

    // Format transcript for analysis
    const conversationText = transcript
      .map((msg: Message) => {
        const speaker = msg.role === "user" ? "Salesperson" : "Becca (Prospect)";
        return `${speaker}: ${msg.content}`;
      })
      .join("\n\n");

    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
        "X-Title": "BrewSpot Becca Feedback"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: evaluationRubric
          },
          {
            role: "user",
            content: `Here is the conversation transcript to evaluate:\n\n${conversationText}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenRouter API error:", errorData);
      return NextResponse.json(
        { error: "Failed to generate feedback", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content;

    if (!feedback) {
      return NextResponse.json(
        { error: "No feedback generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback });

  } catch (error) {
    console.error("Error analyzing transcript:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
