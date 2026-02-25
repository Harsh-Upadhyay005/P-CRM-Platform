/**
 * AI Intelligence Layer — ai.service.js
 *
 * Three independent engines, all self-contained (no external API required):
 *
 *  1. Sentiment Analysis  — scores complaint tone (-1 negative → +1 positive)
 *  2. Priority Prediction — suggests CRITICAL/HIGH/MEDIUM/LOW with confidence
 *  3. Duplicate Detection — cosine similarity (TF) against recent tenant complaints
 *
 * The master export `analyzeComplaint()` runs all three and returns a single object
 * ready to be spread into a Prisma create/update call.
 */

import { prisma } from "../config/db.js";

// ────────────────────────────────────────────────────────────────────────────
// SHARED TEXT UTILITIES
// ────────────────────────────────────────────────────────────────────────────

const tokenize = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

// Common English stop-words — filtered out before building TF vectors
const STOP_WORDS = new Set([
  "the","and","for","are","but","not","you","all","can","her","was","one",
  "our","had","has","his","him","its","may","now","new","own","see","two",
  "who","did","get","let","put","too","use","way","say","she","how","any",
  "from","they","this","that","with","have","will","your","said","been",
  "when","more","than","then","into","also","what","about","some","would",
  "there","their","were","which","them","other","these","those","very",
  "just","over","such","here","well","even","only","much","many","each",
  "most","made","than","them","then","both","time","also","come","came",
  "been","same","last","long","back","down","after","before","through",
  "during","under","again","while","where","should","could","might",
]);

const preprocessText = (text) =>
  tokenize(text).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

// ────────────────────────────────────────────────────────────────────────────
// ENGINE 1: SENTIMENT ANALYSIS
// ────────────────────────────────────────────────────────────────────────────
//
// Algorithm:
//   - Score each token ∈ {+1, -1, 0} based on word lists
//   - Multiply by intensifier window (1.5× for "very", "extremely", etc.)
//   - Negate score when a negation token precedes within 2 tokens
//   - Normalise: raw_score / √(token_count)  →  clamp to [-1, 1]
//
// In CRM context: citizen complaints are usually negative, so a score near
// -1 means a distressed/angry report; near 0 is neutral; near +1 is
// praise/feedback.
// ────────────────────────────────────────────────────────────────────────────

const POSITIVE_WORDS = new Set([
  // Resolution & positive outcome
  "good","great","excellent","satisfied","satisfactory","resolved","fixed","done",
  "completed","solved","working","improved","better","best","fine","okay","ok",
  // Service quality
  "helpful","cooperative","responsive","professional","polite","courteous",
  "efficient","effective","prompt","timely","quick","fast","reliable","clean",
  "safe","adequate","proper","correct","accurate",
  // Gratitude
  "thank","thanks","thankyou","appreciate","appreciated","grateful","thankful",
  // General positive
  "happy","pleased","glad","nice","well","positive","praise","commend",
  "superb","wonderful","perfect","comfortable","smooth","easy","convenient",
]);

const NEGATIVE_WORDS = new Set([
  // Physical damage / hazards
  "broken","damaged","damage","collapsed","collapsing","cracked","destroyed",
  "fallen","leaking","leakage","leak","burst","overflow","overflowing","flooded",
  "flood","floods","flooding","fire","fires","burning","smoke","explosion","blast","collapse",
  // Safety & health
  "dangerous","hazardous","unsafe","risk","accident","accidents","injured","injury",
  "injuries","bleeding","dead","death","deaths","dying","sick","sickness","disease",
  "diseases","contaminated","contamination","epidemic","rats","insects","pest","pests",
  "stench","smell","sewage","garbage","filth","filthy","dirty","unhygienic","polluted",
  // Service failure
  "failed","failure","failures","wrong","error","errors","mistake","mistakes",
  "neglected","ignored","delayed","delay","delays","waiting","slow","late",
  "unresponsive","none","missing","absent","shortage","unavailable","stopped",
  "disconnected","cut","no","lack","lacking","without","issue","issues",
  "problem","problems","complaint","complaints","complaining",
  // Emergency / urgency
  "emergency","emergencies","critical","urgent","severe","extreme","immediate",
  "desperate","terrible","horrible","awful","dreadful","miserable","helpless","suffering",
  // Misconduct
  "corrupt","corruption","bribe","bribes","bribery","fraud","illegal",
  "theft","stolen","robbery","violence","attack","attacks","threatening",
  "threat","threats","harassment","abuse","abusive","rude",
  // Emotional negative
  "angry","anger","frustrated","frustrating","disappointed","disappointment",
  "worried","concern","scared","afraid","panic","helpless","struggling",
  "crying","desperate","furious","outraged","disgusted","disgusting","worst",
  "useless","pathetic","unbearable","intolerable",
]);

const INTENSIFIERS = new Set([
  "very","extremely","highly","severely","seriously","absolutely","completely",
  "totally","utterly","deeply","badly","terribly","incredibly","remarkably",
  "quite","really","so","too","much","most","truly","genuinely","massively",
  "dangerously","critically","urgently",
]);

const NEGATORS = new Set([
  "not","no","never","neither","nor","cannot","cant","wont","isnt","wasnt",
  "arent","werent","dont","doesnt","didnt","wouldnt","couldnt","shouldnt",
  "hardly","barely","scarcely","nothing","nobody","none","nowhere",
]);

/**
 * Analyse the sentiment of `text`.
 * @returns {number} score ∈ [-1, 1]  (negative = bad, positive = good)
 */
export const analyzeSentiment = (text) => {
  if (!text || typeof text !== "string") return 0;

  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;

  let rawScore = 0;
  // Sliding window: intensifier and negation flags reset after 2 tokens
  let intensify = 1;
  let negate    = false;
  let ttlSinceModifier = 0;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];

    if (NEGATORS.has(word)) {
      negate    = true;
      intensify = 1;
      ttlSinceModifier = 0;
      continue;
    }

    if (INTENSIFIERS.has(word)) {
      intensify = 1.5;
      ttlSinceModifier = 0;
      continue;
    }

    let wordScore = 0;
    if (POSITIVE_WORDS.has(word))      wordScore =  1;
    else if (NEGATIVE_WORDS.has(word)) wordScore = -1;

    if (wordScore !== 0) {
      rawScore += wordScore * intensify * (negate ? -1 : 1);
      // Reset modifiers after they are consumed
      intensify = 1;
      negate    = false;
      ttlSinceModifier = 0;
    } else {
      // Age out modifiers — reset after 2 non-modifier, non-scored tokens
      ttlSinceModifier++;
      if (ttlSinceModifier >= 2) {
        intensify        = 1;
        negate           = false;
        ttlSinceModifier = 0;
      }
    }
  }

  // Normalise by √(token_count) to be length-agnostic, clamp to [-1, 1]
  const normalized = rawScore / Math.sqrt(tokens.length);
  return parseFloat(Math.max(-1, Math.min(1, normalized)).toFixed(4));
};

// ────────────────────────────────────────────────────────────────────────────
// ENGINE 2: PRIORITY PREDICTION
// ────────────────────────────────────────────────────────────────────────────
//
// Algorithm:
//   - Keyword tier matching: CRITICAL > HIGH > MEDIUM > LOW
//   - Multi-word phrase scan for compound terms ("gas leak", "no water", etc.)
//   - Category-based boost (government CRM category strings)
//   - Confidence (aiScore) built from hit density + category signal strength
//
// Returns { suggestedPriority, aiScore }
// ────────────────────────────────────────────────────────────────────────────

// Tier 4 — CRITICAL: life/safety/infrastructure emergencies
const CRITICAL_KEYWORDS = new Set([
  "death","died","dead","dying","kill","killed","murder","fire","explosion",
  "blast","collapse","collapsed","collapsing","flood","drowning","drown",
  "earthquake","tsunami","hospital","ambulance","electrocution","gas",
  "terror","riot","shooting","shooting","bomb","trapped","rescue",
  "emergency","critical","lifethreatening","stroke","heart","unconscious",
  "poisoned","poisoning","toxic","outbreak","epidemic","plague","mass",
  "building","structural","dangerous","imminent","catastrophe",
]);

// Multi-word CRITICAL phrases (checked against full text)
const CRITICAL_PHRASES = [
  "gas leak","electric shock","no breathing","not breathing","building collapse",
  "under collapse","water contamination","medical emergency","life threatening",
  "life-threatening","mass casualty","civil unrest","road accident",
  "bridge collapse","pipeline burst","dam break","oil spill","sewage burst",
  "power explosion","transformer fire","acid attack",
];

// Tier 3 — HIGH: significant disruption or harm
const HIGH_KEYWORDS = new Set([
  "dangerous","hazardous","urgent","severe","serious","violence","attack",
  "threat","robbery","theft","stolen","injured","injury","injuries","bleeding",
  "unsafe","immediate","accident","accidents","hurt","missing","blocked",
  "broken","electricity","power","blackout","shortage","flooding","waterlogging",
  "sewage","overflow","contaminated","disease","spreading","pothole","potholes",
  "structural","damage","damaged","outbreak","harassment","abuse","assault",
  "road","bridge","leak","leakage","burst","collapsed","fire","smoke",
  "critical","failure","corrupt","bribe","garbage","waste","rats","pests",
  "stray","manhole","crack","cracks","illegal","unauthorized",
]);

const HIGH_PHRASES = [
  "no water","no electricity","no power","water supply","power cut",
  "road blocked","road damaged","missing child","missing person",
  "unsafe building","sewage overflow","water logging","animal attack",
  "tree fallen","wall fallen","manhole open","open manhole","garbage dump",
  "garbage not collected","stray dogs","stray animals","drug activity",
  "illegal construction","unauthorized construction","accident spot",
];

// Tier 1 — LOW: queries, suggestions, non-urgent requests
const LOW_KEYWORDS = new Set([
  "suggestion","feedback","minor","small","slight","information","query",
  "inquiry","request","check","verify","confirm","general","routine",
  "maintenance","cleaning","cosmetic","aesthetic","enquiry","asking",
  "wanted","wondering","curious","update","status","inform","notify",
  "guide","guidance","direction","help","advise","advice",
]);

const LOW_PHRASES = [
  "general query","general inquiry","general request","minor issue",
  "small complaint","feedback only","want to know","just asking",
];

// Category → base priority tier (0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL)
const CATEGORY_BASE_TIER = {
  emergency:        3,
  safety:           3,
  fire:             3,
  health:           2,
  electricity:      2,
  power:            2,
  water:            2,
  sewage:           2,
  sanitation:       2,
  drainage:         2,
  flood:            2,
  infrastructure:   2,
  road:             2,
  bridge:           2,
  transport:        1,
  environment:      1,
  education:        1,
  noise:            1,
  general:          1,
  feedback:         0,
  suggestion:       0,
};

/**
 * Predict the priority of a complaint from its description and category.
 * @returns {{ suggestedPriority: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", aiScore: number }}
 */
export const predictPriority = (description, category = null) => {
  if (!description) return { suggestedPriority: "MEDIUM", aiScore: 0.5 };

  const tokens  = tokenize(description);
  const fullText = description.toLowerCase();

  // ── Keyword counting ──────────────────────────────────────────────────────
  let criticalHits = 0;
  let highHits     = 0;
  let lowHits      = 0;

  for (const word of tokens) {
    if (CRITICAL_KEYWORDS.has(word))      criticalHits++;
    else if (HIGH_KEYWORDS.has(word))     highHits++;
    else if (LOW_KEYWORDS.has(word))      lowHits++;
  }

  // ── Multi-word phrase scan ─────────────────────────────────────────────────
  for (const phrase of CRITICAL_PHRASES) {
    if (fullText.includes(phrase)) criticalHits += 2; // phrases worth more
  }
  for (const phrase of HIGH_PHRASES) {
    if (fullText.includes(phrase)) highHits += 2;
  }
  for (const phrase of LOW_PHRASES) {
    if (fullText.includes(phrase)) lowHits += 2;
  }

  // ── Category signal ────────────────────────────────────────────────────────
  let categoryTier = -1; // -1 = no category signal
  if (category) {
    const catLower = category.toLowerCase();
    for (const [key, tier] of Object.entries(CATEGORY_BASE_TIER)) {
      if (catLower.includes(key)) {
        categoryTier = Math.max(categoryTier, tier);
      }
    }
  }

  // ── Tier resolution ────────────────────────────────────────────────────────
  // Priority tiers: 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL
  let tier       = 1; // default: MEDIUM
  let confidence = 0.5;

  if (criticalHits >= 1) {
    tier       = 3;
    confidence = Math.min(0.97, 0.75 + criticalHits * 0.08);
  } else if (highHits >= 3 || (highHits >= 1 && categoryTier >= 3)) {
    tier       = 2;
    confidence = Math.min(0.92, 0.65 + highHits * 0.05);
  } else if (highHits >= 1 || categoryTier >= 2) {
    tier       = 2;
    confidence = Math.min(0.80, 0.55 + highHits * 0.04 + (categoryTier >= 2 ? 0.05 : 0));
  } else if (lowHits > 0 && highHits === 0 && criticalHits === 0) {
    tier       = Math.min(1, categoryTier >= 1 ? 1 : 0); // LOW or MEDIUM from category
    confidence = Math.min(0.85, 0.58 + lowHits * 0.08);
  } else {
    // No strong signal — use category if available, else MEDIUM
    if (categoryTier >= 0) {
      tier       = categoryTier;
      confidence = 0.55;
    } else {
      tier       = 1;
      confidence = 0.45; // uncertain — no signal
    }
  }

  // Category can act as a floor (but not exceed the keyword-derived tier)
  if (categoryTier > tier) {
    tier       = categoryTier;
    confidence = Math.max(confidence, 0.52);
  }

  // Clamp tier to [0, 3] — should already be, but be explicit
  tier = Math.max(0, Math.min(3, tier));

  const TIER_LABELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  return {
    suggestedPriority: TIER_LABELS[tier],
    aiScore:           parseFloat(Math.min(1, confidence).toFixed(4)),
  };
};

// ────────────────────────────────────────────────────────────────────────────
// ENGINE 3: DUPLICATE DETECTION (TF Cosine Similarity)
// ────────────────────────────────────────────────────────────────────────────
//
// Algorithm:
//   - Tokenise + strip stop-words → term-frequency (TF) vector
//   - L2-normalise each TF vector
//   - Cosine similarity = dot product of two L2-normalised vectors
//   - Compare new complaint against last SAMPLE_SIZE complaints in the same tenant
//   - Return max similarity ∈ [0, 1]
//
// Interpretation:
//   ≥ 0.85  →  near-certain duplicate
//   0.65–0.84 →  highly similar (likely duplicate)
//   0.40–0.64 →  partially related
//   < 0.40   →  distinct complaint
// ────────────────────────────────────────────────────────────────────────────

// How many recent tenant complaints to compare against
const SAMPLE_SIZE = 200;

// Minimum token length after stop-word removal to bother comparing
const MIN_TOKENS = 2;

/**
 * Build an L2-normalised term-frequency vector from a token list.
 * @returns {Record<string, number>} normalised TF vector
 */
const buildTFVector = (tokens) => {
  const tf = {};
  let count = 0;

  for (const token of tokens) {
    if (token.length < 3) continue;
    tf[token] = (tf[token] ?? 0) + 1;
    count++;
  }

  if (count === 0) return {};

  // L2 norm
  const norm = Math.sqrt(
    Object.values(tf).reduce((sum, v) => sum + v * v, 0),
  );

  if (norm === 0) return {};

  for (const key of Object.keys(tf)) {
    tf[key] = tf[key] / norm;
  }

  return tf;
};

/**
 * Cosine similarity of two L2-normalised TF vectors.
 * Both vectors must have been produced by `buildTFVector`.
 */
const cosineSimilarity = (v1, v2) => {
  // Iterate over the smaller vector for efficiency
  const [small, big] = Object.keys(v1).length <= Object.keys(v2).length
    ? [v1, v2]
    : [v2, v1];

  let dot = 0;
  for (const [term, weight] of Object.entries(small)) {
    if (big[term]) dot += weight * big[term];
  }
  return dot; // dot product of L2-normalised vectors = cosine similarity
};

/**
 * Detect how similar `description` is to recent complaints in the same tenant.
 *
 * @param {string} description        - The complaint text to test
 * @param {string} tenantId           - Scope duplicate search to this tenant
 * @param {string|null} excludeId     - Exclude a specific complaint (for re-analysis)
 * @returns {Promise<number>}          score ∈ [0, 1]
 */
export const detectDuplicate = async (description, tenantId, excludeId = null) => {
  if (!description || !tenantId) return 0;

  const tokens1 = preprocessText(description);
  if (tokens1.length < MIN_TOKENS) return 0;

  const v1 = buildTFVector(tokens1);
  if (Object.keys(v1).length === 0) return 0;

  const recentComplaints = await prisma.complaint.findMany({
    where: {
      tenantId,
      isDeleted: false,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select:  { description: true },
    orderBy: { createdAt: "desc" },
    take:    SAMPLE_SIZE,
  });

  if (recentComplaints.length === 0) return 0;

  let maxSim = 0;

  for (const c of recentComplaints) {
    if (!c.description) continue;

    const tokens2 = preprocessText(c.description);
    if (tokens2.length < MIN_TOKENS) continue;

    const v2  = buildTFVector(tokens2);
    const sim = cosineSimilarity(v1, v2);

    if (sim > maxSim) {
      maxSim = sim;
      if (maxSim >= 0.99) break; // perfect match early-exit
    }
  }

  return parseFloat(Math.min(1, maxSim).toFixed(4));
};

// ────────────────────────────────────────────────────────────────────────────
// MASTER ANALYSIS FUNCTION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Run all three AI engines for a complaint.
 * Never throws — returns safe defaults on any internal failure so that
 * complaint creation is never blocked by AI analysis.
 *
 * @param {{
 *   description: string,
 *   category?: string|null,
 *   tenantId: string,
 *   excludeId?: string|null
 * }} params
 *
 * @returns {Promise<{
 *   sentimentScore: number,        // -1 to 1
 *   duplicateScore: number,        // 0 to 1
 *   suggestedPriority: string,     // "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"
 *   aiScore: number                // confidence 0 to 1
 * }>}
 */
export const analyzeComplaint = async ({
  description,
  category    = null,
  tenantId,
  excludeId   = null,
}) => {
  try {
    // Sentiment and priority are pure computation — run synchronously
    const sentimentScore = analyzeSentiment(description);
    const { suggestedPriority, aiScore } = predictPriority(description, category);

    // Duplicate detection needs the DB — run in parallel with a resolved promise
    const duplicateScore = await detectDuplicate(description, tenantId, excludeId);

    return { sentimentScore, duplicateScore, suggestedPriority, aiScore };
  } catch {
    // AI failure must never block a complaint being filed
    return {
      sentimentScore:   null,
      duplicateScore:   null,
      suggestedPriority: "MEDIUM",
      aiScore:           null,
    };
  }
};
