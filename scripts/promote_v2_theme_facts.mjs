import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("src/game/content2025.ts", "utf8");

function extractArray(name) {
  const pattern = new RegExp(`const ${name}:[^=]+ = (\\[[\\s\\S]*?\\n\\]);`);
  const match = source.match(pattern);
  if (!match) throw new Error(`Cannot find ${name}`);
  return vm.runInNewContext(`(${match[1]})`);
}

const known2025 = extractArray("KNOWN_EVENTS");
const outcomes2025 = extractArray("BUSINESS_OUTCOMES");
const competing2025 = extractArray("COMPETING");
const marketTerms = /(涨|跌|指数|点位|市值|股价|成交额|净买入|反弹|回落|领涨|跌停|涨停|破万亿)/;

function businessFact(theme) {
  const clauses = String(theme.historicalPrototype ?? "")
    .split(/[，。；]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !marketTerms.test(part));
  const fact = clauses.join("，") || String(theme.publicContext).split("。")[0] || theme.protagonistMemory;
  return `历史复盘确认：${fact}。`;
}

function hypotheses(theme) {
  return {
    lin: `围绕“${theme.title}”，把收入、订单、利润率和现金流拆成可验证链条。`,
    chen: `跟踪“${theme.title}”相关成交结构、拥挤度与信号持续性，警惕一次性脉冲。`,
    zhou: `为“${theme.title}”建立估值、传导时滞和下行情景，先写清错误边界。`,
  };
}

for (const year of ["2023", "2024", "2025"]) {
  const path = `src/game/content/${year}.json`;
  const content = JSON.parse(fs.readFileSync(path, "utf8"));
  content.themes = content.themes.map((theme, index) => ({
    ...theme,
    knownEvent: year === "2025" ? known2025[index] : theme.protagonistMemory,
    businessOutcome: year === "2025" ? outcomes2025[index] : businessFact(theme),
    competingHypotheses: year === "2025" ? competing2025[index] : hypotheses(theme),
  }));
  fs.writeFileSync(path, `${JSON.stringify(content, null, 2)}\n`);
}
