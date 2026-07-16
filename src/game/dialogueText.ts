const MIXED_TERMS = [
  "DeepSeek-R1",
  "ChatGPT",
  "AI Agent",
  "AI PC",
  "SaaS",
  "ARR",
  "ToC",
  "ToB",
  "Barra",
  "Alpha",
  "IPO",
  "API",
  "CIO",
  "TMT",
  "SKU",
  "AI",
  "K",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function polishMixedText(text: string): string {
  let polished = text
    .replace(/\bmiss\b/gi, "不及预期")
    .replace(/([\u3400-\u9fff])\s*vs\.?\s*([\u3400-\u9fff])/gi, "$1与$2");
  for (const term of MIXED_TERMS) {
    const escaped = escapeRegExp(term);
    polished = polished
      .replace(new RegExp(`([\\u3400-\\u9fff])(${escaped})`, "g"), "$1 $2")
      .replace(new RegExp(`(${escaped})([\\u3400-\\u9fff])`, "g"), "$1 $2");
  }
  return polished.replace(/[ \t]{2,}/g, " ");
}

export function dialogueText(...paragraphs: string[]): string {
  return paragraphs
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .join("\n\n");
}

export function dialogueParagraphs(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  return paragraphs.length > 0 ? paragraphs : [text];
}
