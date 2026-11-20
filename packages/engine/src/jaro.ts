/**
 * packages/engine/src/jaro.ts
 * Jaro-Winkler similarity, implemented here so name matching has no extra dependency.
 * Used to compare an M-Pesa sender name with the name in the chat.
 */

/**
 * Jaro-Winkler similarity between two strings.
 * @param left - First string
 * @param right - Second string
 * @returns A score from 0 (nothing in common) to 1 (identical)
 */
export function jaroWinkler(left: string, right: string): number {
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  const jaro = jaroScore(left, right);
  const prefix = commonPrefix(left, right, 4);
  // Standard Winkler prefix scale is 0.1, capped at 4 characters.
  return jaro + prefix * 0.1 * (1 - jaro);
}

function jaroScore(left: string, right: string): number {
  const window = Math.max(0, Math.floor(Math.max(left.length, right.length) / 2) - 1);
  const leftMatches = new Array<boolean>(left.length).fill(false);
  const rightMatches = new Array<boolean>(right.length).fill(false);
  let matches = 0;
  for (let i = 0; i < left.length; i++) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, right.length);
    for (let j = start; j < end; j++) {
      if (rightMatches[j]) continue;
      if (left[i] !== right[j]) continue;
      leftMatches[i] = true;
      rightMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < left.length; i++) {
    if (!leftMatches[i]) continue;
    while (!rightMatches[k]) k++;
    if (left[i] !== right[k]) transpositions++;
    k++;
  }
  const m = matches;
  return (m / left.length + m / right.length + (m - transpositions / 2) / m) / 3;
}

function commonPrefix(left: string, right: string, max: number): number {
  const limit = Math.min(max, left.length, right.length);
  let i = 0;
  while (i < limit && left[i] === right[i]) i++;
  return i;
}
