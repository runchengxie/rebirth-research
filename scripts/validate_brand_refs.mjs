import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const roots = ["src", "docs"];
const files = ["README.md", "AGENTS.md"];
const protectedMark = ["C", "F", "A"].join("");
const legacyField = ["c", "f", "a", "Ref"].join("");
const forbidden = [new RegExp(`\\b${protectedMark}\\b`, "i"), new RegExp(legacyField, "i")];

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}

const violations = [...roots.flatMap(walk), ...files.filter((file) => fs.existsSync(file))]
  .filter((file) => /\.(?:ts|tsx|js|mjs|json|md)$/.test(file))
  .flatMap((file) => {
    const text = fs.readFileSync(file, "utf8");
    return forbidden.some((pattern) => pattern.test(text)) ? [file] : [];
  });

if (violations.length > 0) {
  process.stderr.write(`Found unapproved certification-brand references in: ${violations.join(", ")}\n`);
  process.exitCode = 1;
}
