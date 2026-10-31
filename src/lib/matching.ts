/**
 * Deterministic, explainable matching between an OWNER-SUBMITTED case and a
 * recovered-pet record. Pure functions: no I/O, fully unit-tested.
 *
 * HARD RULES
 *  - Output is a tier of "characteristics in common" (strong / moderate / limited),
 *    never a probability or percentage, and never a claim of identity.
 *  - Distinctive markings are NEVER auto-matched; they are surfaced for human review.
 *  - Different species excludes a candidate entirely.
 */

export const MATCH_ALGORITHM_VERSION = "deterministic-v1";

export type CompStatus = "match" | "close" | "differs" | "unavailable" | "review";
export type Tier = "strong" | "moderate" | "limited";

export interface Comparison {
  field: "name" | "weight" | "species" | "sex" | "primary_color" | "secondary_colors" | "markings" | "timeline";
  status: CompStatus;
  label: string;
  detail: string;
}

export interface MatchResult {
  tier: Tier;
  comparisons: Comparison[];
  /** internal ordering only — NEVER display */
  sortScore: number;
}

export interface MatchCase {
  pet_name: string | null;
  species: string | null;
  sex: string | null;
  primary_color: string | null;
  secondary_colors: string[] | null;
  approx_weight_kg: number | null;
  verified_weight_kg: number | null;
  distinctive_markings: string | null;
  distinguishing_description: string | null;
  death_date: string | null;
  surrendered_on: string | null;
}

export interface MatchPet {
  public_case_number?: string;
  label_name: string | null;
  label_weight_kg: number | null;
  species: string;
  possible_sex: string;
  primary_color: string | null;
  secondary_colors: string[] | null;
  visible_markings: string | null;
  collar_description: string | null;
  distinctive_features: string | null;
  documented_on: string | null;
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------
export function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Crude phonetic key so spelling variants (Mochi/Mochie/Motchi, Kisses/Kisess) collide. */
export function phoneticKey(norm: string): string {
  return norm
    .replace(/ph/g, "f")
    .replace(/tch/g, "ch")
    .replace(/ck/g, "k")
    .replace(/c(?=[aou]|$)/g, "k")
    .replace(/c/g, "s")
    .replace(/[qk]/g, "k")
    .replace(/z/g, "s")
    .replace(/y/g, "i")
    .replace(/ie|ee|ea/g, "i")
    .replace(/oo|ou/g, "u")
    .replace(/(.)\1+/g, "$1")
    .replace(/[^a-z0-9]/g, "")
    .replace(/[aeiou]+$/, "");
}

export type NameLevel = "exact" | "close" | "none" | "unavailable";

export function compareNames(a: string | null | undefined, b: string | null | undefined): NameLevel {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return "unavailable";
  if (x === y) return "exact";
  const xt = x.split(" ").filter((t) => t.length >= 3);
  const yt = y.split(" ").filter((t) => t.length >= 3);
  if (xt.some((t) => yt.includes(t))) return "close"; // shares a whole name token
  const maxLen = Math.max(x.length, y.length);
  const dist = levenshtein(x, y);
  if (maxLen >= 4 && dist <= 1) return "close";
  if (maxLen >= 7 && dist <= 2) return "close";
  const short = x.length <= y.length ? x : y;
  const long = short === x ? y : x;
  if (short.length >= 4 && long.startsWith(short)) return "close"; // Choco / Chocolate
  const px = phoneticKey(x);
  const py = phoneticKey(y);
  if (px.length >= 3 && px === py) return "close";
  return "none";
}

// ---------------------------------------------------------------------------
// Weights
// ---------------------------------------------------------------------------
export type WeightLevel = "exact" | "within_0_5" | "within_1" | "larger" | "unavailable";

export function compareWeights(a: number | null | undefined, b: number | null | undefined): { level: WeightLevel; diff: number | null } {
  if (a == null || b == null || Number.isNaN(Number(a)) || Number.isNaN(Number(b))) return { level: "unavailable", diff: null };
  const diff = Math.round(Math.abs(Number(a) - Number(b)) * 100) / 100;
  if (diff <= 0.05) return { level: "exact", diff };
  if (diff <= 0.5) return { level: "within_0_5", diff };
  if (diff <= 1) return { level: "within_1", diff };
  return { level: "larger", diff };
}

// ---------------------------------------------------------------------------
// Colours (English + common Filipino terms)
// ---------------------------------------------------------------------------
const COLOR_SYNONYMS: Record<string, string> = {
  white: "white", puti: "white", snow: "white",
  black: "black", itim: "black",
  brown: "brown", kayumanggi: "brown", chocolate: "brown", brindle: "brindle", brindled: "brindle",
  tan: "tan", beige: "tan", fawn: "fawn", yellow: "golden", golden: "golden", gold: "golden", blonde: "golden",
  cream: "cream", ivory: "cream", buff: "cream",
  gray: "gray", grey: "gray", abo: "gray", silver: "gray", blue: "gray",
  orange: "orange", ginger: "orange", red: "orange", rust: "orange",
  tricolor: "tricolor", tricolour: "tricolor", calico: "tricolor", tortie: "tricolor", tortoiseshell: "tricolor",
  tabby: "tabby", spotted: "spotted", merle: "merle",
};
const COLOR_FAMILIES: string[][] = [
  ["white", "cream"],
  ["brown", "tan", "fawn", "golden", "orange", "brindle"],
  ["gray"],
  ["black"],
  ["tricolor", "tabby", "spotted", "merle"],
];

export function extractColors(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const tok of normalizeName(text).split(" ")) {
    const c = COLOR_SYNONYMS[tok];
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

function sameFamily(a: string, b: string): boolean {
  return COLOR_FAMILIES.some((f) => f.includes(a) && f.includes(b));
}

export type ColorLevel = "same" | "similar" | "different" | "unavailable";

export function compareColor(a: string | null | undefined, b: string | null | undefined): ColorLevel {
  const x = extractColors(a)[0];
  const y = extractColors(b)[0];
  if (!x || !y) return "unavailable";
  if (x === y) return "same";
  if (sameFamily(x, y)) return "similar";
  return "different";
}

function allColors(primary: string | null, secondary: string[] | null): string[] {
  const set = new Set<string>();
  extractColors(primary).forEach((c) => set.add(c));
  for (const s of secondary ?? []) extractColors(s).forEach((c) => set.add(c));
  return [...set];
}

// ---------------------------------------------------------------------------
// Markings (text overlap — only ever used to prompt a human, never to confirm)
// ---------------------------------------------------------------------------
const STOP = new Set(["the", "a", "an", "and", "or", "with", "on", "of", "in", "at", "to", "has", "have", "had", "is", "are", "was", "his", "her", "its", "very", "small", "big", "large", "little", "near", "left", "right", "side", "ang", "ng", "sa", "na", "may", "at", "ay", "pet", "dog", "cat"]);

export function markingTokens(...texts: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const t of texts) {
    for (const raw of normalizeName(t).split(" ")) {
      const tok = raw.length > 3 && raw.endsWith("s") ? raw.slice(0, -1) : raw;
      if (tok.length >= 3 && !STOP.has(tok) && !COLOR_SYNONYMS[tok]) set.add(tok);
    }
  }
  return [...set];
}

export function sharedMarkingTerms(a: string[], b: string[]): string[] {
  return a.filter((t) => b.includes(t));
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------
const symbolWeights = (kg: number) => `${Number(kg)} kg`;

export function computeMatch(c: MatchCase, p: MatchPet): MatchResult | null {
  const comparisons: Comparison[] = [];

  // Species (hard filter)
  const cSpecies = c.species && c.species !== "other" ? c.species : null;
  const pSpecies = p.species && p.species !== "unknown" && p.species !== "other" ? p.species : null;
  if (cSpecies && pSpecies && cSpecies !== pSpecies) return null;
  const speciesKnownSame = !!(cSpecies && pSpecies && cSpecies === pSpecies);
  comparisons.push(
    speciesKnownSame
      ? { field: "species", status: "match", label: "Species", detail: "same" }
      : { field: "species", status: "unavailable", label: "Species", detail: "unavailable or not specific enough to compare" },
  );

  // Name
  const nameLevel = compareNames(c.pet_name, p.label_name);
  comparisons.push({
    field: "name",
    label: "Name",
    status: nameLevel === "exact" ? "match" : nameLevel === "close" ? "close" : nameLevel === "none" ? "differs" : "unavailable",
    detail:
      nameLevel === "exact"
        ? "exact match"
        : nameLevel === "close"
          ? `close spelling or similar name ("${c.pet_name}" vs "${p.label_name}")`
          : nameLevel === "none"
            ? `different ("${c.pet_name}" vs "${p.label_name}")`
            : "unavailable",
  });

  // Weight — prefer the owner's veterinary/verified weight
  const ownerWeight = c.verified_weight_kg ?? c.approx_weight_kg;
  const w = compareWeights(ownerWeight, p.label_weight_kg);
  comparisons.push({
    field: "weight",
    label: "Weight",
    status: w.level === "exact" ? "match" : w.level === "within_0_5" || w.level === "within_1" ? "close" : w.level === "larger" ? "differs" : "unavailable",
    detail:
      w.level === "unavailable"
        ? "unavailable"
        : `${symbolWeights(ownerWeight as number)} (owner-submitted) vs ${symbolWeights(p.label_weight_kg as number)} (source label)` +
          (w.level === "exact" ? "" : w.level === "within_0_5" ? " — within ±0.5 kg" : w.level === "within_1" ? " — within ±1 kg" : ` — differs by ${w.diff} kg`),
  });

  // Sex
  const cSex = c.sex && c.sex !== "unknown" ? c.sex : null;
  const pSex = p.possible_sex && p.possible_sex !== "unknown" ? p.possible_sex : null;
  const sexDiffers = !!(cSex && pSex && cSex !== pSex);
  comparisons.push({
    field: "sex",
    label: "Sex",
    status: !cSex || !pSex ? "unavailable" : sexDiffers ? "differs" : "match",
    detail: !cSex || !pSex ? "unavailable" : sexDiffers ? `different (${cSex} vs ${pSex})` : "same",
  });

  // Colours
  const prim = compareColor(c.primary_color, p.primary_color);
  const cAll = allColors(c.primary_color, c.secondary_colors);
  const pAll = allColors(p.primary_color, p.secondary_colors);
  let primStatus: CompStatus = "unavailable";
  let primDetail = "unavailable";
  if (prim === "same") (primStatus = "match"), (primDetail = "consistent");
  else if (prim === "similar") (primStatus = "close"), (primDetail = "similar colour family");
  else if (prim === "different") {
    const cp = extractColors(c.primary_color)[0];
    const appears = pAll.some((x) => x === cp || sameFamily(x, cp));
    if (appears) (primStatus = "close"), (primDetail = "owner's primary colour appears among the recovered record's colours");
    else (primStatus = "differs"), (primDetail = `different (${c.primary_color} vs ${p.primary_color})`);
  }
  comparisons.push({ field: "primary_color", label: "Primary colour", status: primStatus, detail: primDetail });

  const cSec = (c.secondary_colors ?? []).flatMap(extractColors);
  const pSec = (p.secondary_colors ?? []).flatMap(extractColors);
  let secStatus: CompStatus = "unavailable";
  let secDetail = "unavailable";
  if (cSec.length && pSec.length) {
    const shared = cSec.filter((x) => pSec.some((y) => y === x || sameFamily(x, y)));
    if (shared.length) (secStatus = "match"), (secDetail = `in common: ${[...new Set(shared)].join(", ")}`);
    else (secStatus = "differs"), (secDetail = "no secondary colours in common");
  }
  comparisons.push({ field: "secondary_colors", label: "Secondary colours", status: secStatus, detail: secDetail });

  // Distinctive markings — human review only
  const ct = markingTokens(c.distinctive_markings, c.distinguishing_description);
  const pt = markingTokens(p.visible_markings, p.collar_description, p.distinctive_features);
  if (ct.length && pt.length) {
    const shared = sharedMarkingTerms(ct, pt);
    comparisons.push({
      field: "markings",
      label: "Distinctive markings",
      status: "review",
      detail: shared.length
        ? `possible shared terms: ${shared.slice(0, 6).join(", ")} — requires human review`
        : "no shared terms found automatically — requires human review",
    });
  } else {
    comparisons.push({ field: "markings", label: "Distinctive markings", status: "review", detail: "requires human review" });
  }

  // Timeline
  const ownerDate = c.surrendered_on ?? c.death_date;
  if (ownerDate && p.documented_on) {
    const ok = p.documented_on >= ownerDate;
    comparisons.push({
      field: "timeline",
      label: "Timeline",
      status: ok ? "match" : "differs",
      detail: ok
        ? "recovered record was documented on or after the date the pet was surrendered / passed"
        : "recovered record is dated before the date the owner reports",
    });
  } else {
    comparisons.push({ field: "timeline", label: "Timeline", status: "unavailable", detail: "unavailable" });
  }

  // ---- Tiering (explainable rules, no numeric identity score) ----
  const nameHit = nameLevel === "exact" || nameLevel === "close";
  const weightStrong = w.level === "exact" || w.level === "within_0_5";
  const weightHit = weightStrong || w.level === "within_1";
  const colorPrimHit = prim === "same" || prim === "similar";
  const colorSecHit = secStatus === "match";
  const colorSignals = (colorPrimHit ? 1 : 0) + (colorSecHit ? 1 : 0);
  const specific = (nameHit ? 1 : 0) + (weightHit ? 1 : 0);

  let tier: Tier | null = null;
  if (nameHit && weightStrong && speciesKnownSame && !sexDiffers) tier = "strong";
  else if (nameHit && weightStrong && speciesKnownSame && sexDiffers) tier = "moderate";
  else if (specific >= 2 || (specific >= 1 && colorSignals >= 1)) tier = "moderate";
  else if (specific >= 1 || colorSignals >= 2) tier = "limited";
  if (!tier) return null;

  // Internal ordering only
  const sortScore =
    (nameLevel === "exact" ? 4 : nameLevel === "close" ? 2 : 0) +
    (w.level === "exact" ? 4 : w.level === "within_0_5" ? 3 : w.level === "within_1" ? 1 : 0) +
    colorSignals +
    (speciesKnownSame ? 1 : 0) -
    (sexDiffers ? 1 : 0);

  return { tier, comparisons, sortScore };
}

export const TIER_ORDER: Record<Tier, number> = { strong: 0, moderate: 1, limited: 2 };

// ---------------------------------------------------------------------------
// Registry search (owner-driven criteria)
// ---------------------------------------------------------------------------
export interface SearchCriteria {
  name?: string;
  approxName?: boolean;
  weightMin?: number | null;
  weightMax?: number | null;
  species?: string;
  sex?: string;
  color?: string;
  size?: string;
  markings?: string;
}

export interface SearchHit<T extends MatchPet & { estimated_size?: string }> {
  pet: T;
  score: number;
  notes: string[];
}

export function searchPets<T extends MatchPet & { estimated_size?: string }>(criteria: SearchCriteria, pets: T[]): SearchHit<T>[] {
  const hits: SearchHit<T>[] = [];
  for (const pet of pets) {
    let score = 0;
    const notes: string[] = [];
    let ok = true;

    if (criteria.name?.trim()) {
      const lvl = compareNames(criteria.name, pet.label_name);
      const norm = normalizeName(criteria.name);
      const contains = !!norm && normalizeName(pet.label_name).includes(norm);
      if (lvl === "exact") (score += 4), notes.push("name: exact");
      else if (contains) (score += 3), notes.push("name: contains");
      else if (criteria.approxName && lvl === "close") (score += 2), notes.push("name: close spelling");
      else ok = false;
    }
    if (ok && (criteria.weightMin != null || criteria.weightMax != null)) {
      const w = pet.label_weight_kg;
      if (w == null) ok = false;
      else {
        const lo = criteria.weightMin ?? -Infinity;
        const hi = criteria.weightMax ?? Infinity;
        if (w >= lo && w <= hi) (score += 3), notes.push(`weight ${w} kg in range`);
        else ok = false;
      }
    }
    if (ok && criteria.species) {
      if (pet.species === criteria.species) score += 1;
      else if (pet.species !== "unknown") ok = false;
    }
    if (ok && criteria.sex) {
      if (pet.possible_sex === criteria.sex) score += 1;
      else if (pet.possible_sex !== "unknown") ok = false;
    }
    if (ok && criteria.size) {
      if (pet.estimated_size === criteria.size) score += 1;
      else if (pet.estimated_size && pet.estimated_size !== "unknown") ok = false;
    }
    if (ok && criteria.color?.trim()) {
      const want = extractColors(criteria.color);
      const have = allColors(pet.primary_color, pet.secondary_colors);
      if (want.length === 0) ok = false;
      else if (want.every((w) => have.some((h) => h === w || sameFamily(h, w)))) (score += 2), notes.push("colours consistent");
      else ok = false;
    }
    if (ok && criteria.markings?.trim()) {
      const shared = sharedMarkingTerms(
        markingTokens(criteria.markings),
        markingTokens(pet.visible_markings, pet.collar_description, pet.distinctive_features),
      );
      if (shared.length) (score += 2), notes.push(`markings terms in common: ${shared.join(", ")}`);
      else ok = false;
    }
    if (ok) hits.push({ pet, score, notes });
  }
  return hits.sort((a, b) => b.score - a.score);
}
