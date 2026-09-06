// Converts docs/content-drafts/*.md into src/content/deck/*.{locale}.ts.
// Usage: node scripts/convert-deck-content.mjs
//
// Meanings draft (per locale): docs/content-drafts/card-meanings-draft[.locale].md
//   "## N. Name" headings, each followed by a meaning-marker paragraph
//   block and a beside-marker paragraph block, separated by "---" rules.
//   English markers: "**Meaning.**" / "**Beside other cards.**"
//   Traditional Chinese markers: "**牌義：**" / "**與其他牌相鄰時：**"
// Pairs draft (per locale): docs/content-drafts/card-pairs-draft[.locale].md
//   "## N. Name" headings (the leading/subject card), each followed by
//   "**First + Second** — text" lines.
//
// Never hand-edit the generated .ts files — re-run this script instead.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DRAFTS_DIR = path.join(ROOT, "docs", "content-drafts");
const CONTENT_DIR = path.join(ROOT, "src", "content", "deck");
const MESSAGES_DIR = path.join(ROOT, "messages");

const LOCALES = [
  {
    locale: "en",
    meaningsDraft: "card-meanings-draft.md",
    pairsDraft: "card-pairs-draft.md",
    meaningsOut: "card-meanings.en.ts",
    pairsOut: "card-pairs.en.ts",
    meaningMarker: "**Meaning.**",
    besideMarker: "**Beside other cards.**",
    checkHeadingName(entry, slug) {
      if (!entry.name.toLowerCase().startsWith(slug.slice(0, 4))) {
        console.warn(
          `  warning: draft heading "${entry.name}" (id ${entry.id}) looks different from cards.ts slug "${slug}" — check for a naming mismatch.`,
        );
      }
    },
  },
  {
    locale: "zh-TW",
    meaningsDraft: "card-meanings-draft.zh-TW.md",
    pairsDraft: "card-pairs-draft.zh-TW.md",
    meaningsOut: "card-meanings.zh-TW.ts",
    pairsOut: "card-pairs.zh-TW.ts",
    meaningMarker: "**牌義：**",
    besideMarker: "**與其他牌相鄰時：**",
    checkHeadingName(entry, slug, messages) {
      const expected = messages?.cards?.[slug]?.name;
      if (expected && entry.name !== expected) {
        console.warn(
          `  warning: draft heading "${entry.name}" (id ${entry.id}) does not match messages/zh-TW.json name "${expected}" for slug "${slug}".`,
        );
      }
    },
  },
];

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

async function readIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

// Parses src/data/cards.ts with a regex (no TS execution, no new
// dependency) to get an id -> slug map for cross-checking.
async function loadCards() {
  const src = await readFile(path.join(ROOT, "src", "data", "cards.ts"), "utf8");
  const re = /card\((\d+),\s*"([a-z]+)"/g;
  const byId = new Map();
  let m;
  while ((m = re.exec(src))) {
    byId.set(Number(m[1]), m[2]);
  }
  if (byId.size !== 36) {
    fail(`Expected 36 cards in src/data/cards.ts, found ${byId.size}.`);
  }
  return byId;
}

async function loadMessages(locale) {
  const raw = await readIfExists(path.join(MESSAGES_DIR, `${locale}.json`));
  return raw ? JSON.parse(raw) : null;
}

// Strips markdown emphasis markers (the drafts use *italic* / **bold**
// for inline emphasis) since the site renders this text as plain
// strings, not markdown.
function stripEmphasis(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

function normalizeParagraphs(block) {
  return block
    .split(/\n\s*\n/)
    .map((p) => stripEmphasis(p.replace(/\s+/g, " ").trim()))
    .filter(Boolean)
    .join("\n\n");
}

function splitEntries(markdown) {
  const lines = markdown.split("\n");
  const headingRe = /^##\s+(\d+)\.\s+(.+?)\s*$/;
  const entries = [];
  let current = null;
  for (const line of lines) {
    const match = headingRe.exec(line);
    if (match) {
      if (current) entries.push(current);
      current = { id: Number(match[1]), name: match[2].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) entries.push(current);
  return entries;
}

function parseMeaningsDraft(markdown, cardsById, config, messages) {
  const entries = splitEntries(markdown);
  const meanings = [];
  const seenIds = new Set();

  for (const entry of entries) {
    const body = entry.lines.join("\n");
    const { meaningMarker, besideMarker } = config;
    const meaningStart = body.indexOf(meaningMarker);
    const besideStart = body.indexOf(besideMarker);
    if (meaningStart === -1 || besideStart === -1) {
      fail(`Card ${entry.id} (${entry.name}): missing "${meaningMarker}" or "${besideMarker}" block.`);
    }

    const meaningBlock = body.slice(meaningStart + meaningMarker.length, besideStart);
    let besideBlock = body.slice(besideStart + besideMarker.length);
    // Cut the trailing "---" rule (and anything after it) off the last section.
    const ruleIdx = besideBlock.search(/\n\s*---\s*(\n|$)/);
    if (ruleIdx !== -1) besideBlock = besideBlock.slice(0, ruleIdx);

    const meaning = normalizeParagraphs(meaningBlock);
    const beside = normalizeParagraphs(besideBlock);
    if (!meaning) fail(`Card ${entry.id} (${entry.name}): empty meaning text.`);
    if (!beside) fail(`Card ${entry.id} (${entry.name}): empty beside text.`);

    if (seenIds.has(entry.id)) fail(`Duplicate card id ${entry.id} in meanings draft.`);
    seenIds.add(entry.id);

    if (!cardsById.has(entry.id)) {
      fail(`Card id ${entry.id} (${entry.name}) does not exist in src/data/cards.ts.`);
    }
    const slug = cardsById.get(entry.id);
    config.checkHeadingName(entry, slug, messages);

    meanings.push({ id: entry.id, meaning, beside });
  }

  // Assertions the brief requires: exactly 36, ids 1-36, no gaps/duplicates.
  if (meanings.length !== 36) {
    fail(`Expected exactly 36 meanings, parsed ${meanings.length}.`);
  }
  const ids = meanings.map((m) => m.id).sort((a, b) => a - b);
  for (let i = 0; i < 36; i++) {
    if (ids[i] !== i + 1) {
      fail(`Card ids must run 1-36 with no gaps or duplicates; found ${JSON.stringify(ids)}.`);
    }
  }

  meanings.sort((a, b) => a.id - b.id);
  return meanings;
}

function renderMeaningsFile(meanings, config) {
  const entries = meanings
    .map(
      (m) =>
        `  { id: ${m.id}, meaning: ${JSON.stringify(m.meaning)}, beside: ${JSON.stringify(m.beside)} },`,
    )
    .join("\n");
  return `// GENERATED by scripts/convert-deck-content.mjs from
// docs/content-drafts/${config.meaningsDraft} — do not hand-edit.
// Re-run the script to regenerate after the draft changes.
import type { CardMeaning } from "./types";

export const CARD_MEANINGS: CardMeaning[] = [
${entries}
];
`;
}

function parsePairsDraft(markdown, cardsById) {
  const entries = splitEntries(markdown);
  const pairs = [];
  const pairLineRe = /^\s*\*\*(.+?)\s*\+\s*(.+?)\*\*\s*[—–-]\s*(.+?)\s*$/;
  const nameToId = new Map();
  for (const [id, slug] of cardsById) nameToId.set(slug, id);

  function resolveName(name) {
    // Best-effort: match against the numbered heading names we've seen,
    // falling back to a slug-ish comparison against src/data/cards.ts.
    const cleaned = name.trim();
    for (const entry of entries) {
      if (entry.name.toLowerCase() === cleaned.toLowerCase()) return entry.id;
    }
    for (const [slug, id] of nameToId) {
      if (slug.toLowerCase() === cleaned.toLowerCase().replace(/\s+/g, "")) return id;
    }
    return null;
  }

  for (const entry of entries) {
    for (const line of entry.lines) {
      const match = pairLineRe.exec(line);
      if (!match) continue;
      const firstId = resolveName(match[1]);
      const secondId = resolveName(match[2]);
      const text = stripEmphasis(match[3].trim());
      if (firstId === null || secondId === null) {
        fail(`Pair line under "${entry.name}" has an unresolvable card name: "${line.trim()}"`);
      }
      pairs.push({ first: firstId, second: secondId, text });
    }
  }

  if (pairs.length !== 180) {
    fail(`Expected exactly 180 pairs, parsed ${pairs.length}.`);
  }

  const firstCounts = new Map();
  const seenKeys = new Set();
  for (const p of pairs) {
    if (p.first === p.second) fail(`Pair has first === second (card ${p.first}).`);
    const key = `${p.first}->${p.second}`;
    if (seenKeys.has(key)) fail(`Duplicate (first, second) pair: ${key}`);
    seenKeys.add(key);
    firstCounts.set(p.first, (firstCounts.get(p.first) ?? 0) + 1);
    if (!cardsById.has(p.first) || !cardsById.has(p.second)) {
      fail(`Pair ${key} references a card id outside 1-36.`);
    }
  }
  for (let id = 1; id <= 36; id++) {
    const count = firstCounts.get(id) ?? 0;
    if (count !== 5) {
      fail(`Card ${id} appears as "first" ${count} times, expected exactly 5.`);
    }
  }

  return pairs;
}

function renderPairsFile(pairs, config) {
  const entries = pairs
    .map(
      (p) =>
        `  { first: ${p.first}, second: ${p.second}, text: ${JSON.stringify(p.text)} },`,
    )
    .join("\n");
  return `// GENERATED by scripts/convert-deck-content.mjs from
// docs/content-drafts/${config.pairsDraft} — do not hand-edit.
// Re-run the script to regenerate after the draft changes.
import type { CardPair } from "./types";

export const CARD_PAIRS: CardPair[] = [
${entries}
];
`;
}

async function main() {
  const cardsById = await loadCards();

  for (const config of LOCALES) {
    const messages = await loadMessages(config.locale);

    const meaningsDraft = await readIfExists(path.join(DRAFTS_DIR, config.meaningsDraft));
    if (meaningsDraft) {
      const meanings = parseMeaningsDraft(meaningsDraft, cardsById, config, messages);
      await writeFile(path.join(CONTENT_DIR, config.meaningsOut), renderMeaningsFile(meanings, config));
      console.log(`${config.meaningsOut}: wrote ${meanings.length} meanings (ids 1-${meanings.length}).`);
    } else {
      console.log(`Skipping ${config.locale} meanings: ${path.join("docs", "content-drafts", config.meaningsDraft)} not found.`);
    }

    const pairsDraft = await readIfExists(path.join(DRAFTS_DIR, config.pairsDraft));
    if (pairsDraft) {
      const pairs = parsePairsDraft(pairsDraft, cardsById);
      await writeFile(path.join(CONTENT_DIR, config.pairsOut), renderPairsFile(pairs, config));
      console.log(`${config.pairsOut}: wrote ${pairs.length} pairs (36 cards x 5).`);
    } else {
      console.log(`Skipping ${config.locale} pairs: ${path.join("docs", "content-drafts", config.pairsDraft)} not found.`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
