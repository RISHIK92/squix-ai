export function parseIntelligentJson(text: string): any {
  let cleanText = text.trim();

  cleanText = cleanText.replace(/^```(?:json|JSON)?\s*\n?/m, "");
  cleanText = cleanText.replace(/\n?```\s*$/m, "");
  cleanText = cleanText.trim();

  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No valid JSON object found in the LLM response.");
  }

  cleanText = cleanText.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.error(
      "Final JSON parsing attempt failed for cleaned text:",
      cleanText
    );
    throw new Error(
      `Failed to parse cleaned JSON. Details: ${(error as Error).message}`
    );
  }
}
