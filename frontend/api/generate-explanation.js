const SYSTEM_PROMPT = `You are an educational disciplinary assessment assistant.

Generate a professional disciplinary explanation using ONLY the provided data.

Do not invent sanctions.
Do not add violations.
Keep the explanation concise and formal.`;

function deterministicFallback(payload) {
  const offenseCategory = payload.offenseCategory || "Unspecified Category";
  const offenseType = payload.offenseType || "Unspecified Offense";
  const offenseCount = payload.offenseCount ?? "N/A";
  const severityScore = payload.severityScore ?? "N/A";
  const recommendedSanction = payload.recommendedSanction || "N/A";

  return `Based on the recorded violation, the case is classified under ${offenseCategory} (${offenseType}). ` +
    `This incident corresponds to offense count ${offenseCount} with a severity score of ${severityScore}. ` +
    `Following the system's deterministic rule engine, the recommended sanction is: ${recommendedSanction}. ` +
    `This explanation is generated for counselor review and does not replace formal disciplinary due process.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

    if (!apiKey) {
      return res.status(200).json({
        explanation: deterministicFallback(payload),
        source: "fallback",
      });
    }

    const userInput = [
      `offense category: ${payload.offenseCategory || "N/A"}`,
      `offense type: ${payload.offenseType || "N/A"}`,
      `offense count: ${payload.offenseCount ?? "N/A"}`,
      `severity score: ${payload.severityScore ?? "N/A"}`,
      `recommended sanction: ${payload.recommendedSanction || "N/A"}`,
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userInput}` }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 220,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = await response.json();
    const explanation =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!explanation) {
      throw new Error("Gemini returned empty explanation");
    }

    return res.status(200).json({ explanation, source: "gemini" });
  } catch (error) {
    console.error("Explanation generation error:", error);
    return res.status(200).json({
      explanation: deterministicFallback(req.body || {}),
      source: "fallback",
    });
  }
}
