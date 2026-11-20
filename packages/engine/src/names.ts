/**
 * packages/engine/src/names.ts
 * Compare a chat name with an M-Pesa sender name.
 * M-Pesa names are usually two or three uppercase tokens, sometimes abbreviated ("J. WANJIKU").
 * A single strong token is enough: spouses and nicknames must not become a hard fail.
 */
import { jaroWinkler } from "./jaro.js";

export type NameBand = "strong" | "weak" | "none";

export interface NameScore {
  score: number;
  band: NameBand;
}

/**
 * Score how well two personal names match.
 * @param chatName - Name from the order chat
 * @param mpesaName - Name from the M-Pesa message
 * @returns The best token score and a band: strong >= 0.88, weak >= 0.6, otherwise none
 */
export function scoreNames(chatName: string, mpesaName: string): NameScore {
  const left = tokenize(chatName);
  const right = tokenize(mpesaName);
  if (!left.length || !right.length) return { score: 0, band: "none" };

  let best = 0;
  let bestIsFullToken = false;
  const used = new Set<number>();
  // Greedy assignment: pair the strongest remaining tokens first so a shared surname is not wasted.
  const pairs: { i: number; j: number; score: number; full: boolean }[] = [];
  for (let i = 0; i < left.length; i++) {
    for (let j = 0; j < right.length; j++) {
      const a = left[i] ?? "";
      const b = right[j] ?? "";
      const full = a.length >= 2 && b.length >= 2;
      pairs.push({ i, j, score: tokenScore(a, b), full });
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const usedLeft = new Set<number>();
  for (const pair of pairs) {
    if (usedLeft.has(pair.i) || used.has(pair.j)) continue;
    usedLeft.add(pair.i);
    used.add(pair.j);
    if (pair.score > best) {
      best = pair.score;
      bestIsFullToken = pair.full;
    }
  }

  // An initial ("J") can support a weak match, but it must not by itself count as strong.
  if (best >= 0.88 && bestIsFullToken) return { score: best, band: "strong" };
  if (best >= 0.6) return { score: best, band: "weak" };
  return { score: best, band: "none" };
}

function tokenize(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function tokenScore(left: string, right: string): number {
  if (left === right) return 1;
  // A one-letter initial matches the start of the other token, but only as a weak hint.
  if (left.length === 1 || right.length === 1) {
    const initial = left.length === 1 ? left : right;
    const full = left.length === 1 ? right : left;
    return full.startsWith(initial) ? 0.7 : 0;
  }
  return jaroWinkler(left, right);
}
