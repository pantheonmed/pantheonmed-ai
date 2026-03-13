/**
 * PantheonMed Intent Classifier
 * ==============================
 * Classifies user messages into intent categories BEFORE the clinical
 * reasoning engine is invoked.  Supports English and Hindi/Hinglish.
 *
 * Intents
 * -------
 *  SYMPTOM_QUERY      → clinical interview + triage engine
 *  HEALTH_GOAL        → wellness / lifestyle coach response
 *  MEDICAL_KNOWLEDGE  → educational medical explainer
 *  GENERAL            → generic AI response
 *
 * Algorithm: scoring across four signal groups. Highest score wins.
 * Goal signals take a priority bonus so health goals like
 * "weight loss krna hai" are never misrouted as symptom diagnoses.
 */

import { detectPrimarySymptom } from "./clinicalInterviewEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MessageIntent =
  | "SYMPTOM_QUERY"
  | "HEALTH_GOAL"
  | "MEDICAL_KNOWLEDGE"
  | "GENERAL";

export interface IntentResult {
  intent: MessageIntent;
  confidence: "high" | "medium" | "low";
  label: string; // short human-readable description used for the badge
}

/** One collapsible section inside a WellnessCard response. */
export interface WellnessSection {
  label: string;
  emoji: string;
  points: string[];
}

/** Structured response returned by the AI for HEALTH_GOAL and MEDICAL_KNOWLEDGE intents. */
export interface WellnessResponse {
  category: "HEALTH_GOAL" | "MEDICAL_KNOWLEDGE";
  headline: string;
  overview: string;
  sections: WellnessSection[];
  caution?: string;
  doctor_advice?: string;
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// Signal patterns — each pattern awards points to the matching intent bucket
// ---------------------------------------------------------------------------

/** Explicit goal language (English + Hindi/Hinglish).
 *  These override symptom keywords (weight loss can be both a goal and
 *  a symptom — the presence of goal language resolves the ambiguity). */
const HEALTH_GOAL_PATTERNS: RegExp[] = [
  // ── English goal phrases ────────────────────────────────────────────────
  /\b(want to|how to|need to|tips? (for|on)|guide (for|to|on)|advice (for|on)|plan for|routine for|help me)\b.{0,30}\b(weight|fat|muscle|body|fitness|calories|diet|exercise|workout|slim|bulk|tone)\b/i,
  /\b(lose|gain|burn|build|reduce|increase|improve|cut|bulk)\b.{0,20}\b(weight|fat|muscle|calories|body|belly)\b/i,
  /\b(weight loss|weight gain|fat loss|muscle gain|body fat|lose weight|gain weight|gain muscle)\b/i,
  /\b(diet plan|meal plan|workout plan|exercise plan|fitness plan|nutrition plan|calorie (plan|count|deficit))\b/i,
  /\b(belly fat|love handles|get slim|get fit|stay fit|stay healthy|build muscle|tone (up|body)|get toned)\b/i,
  /\b(how many calories|macro(nutrient)?s?|protein intake|carbs intake|keto|intermittent fasting|IF diet)\b/i,
  /\b(bmi|body mass index)\b.{0,30}\b(reduce|lower|improve|good|healthy)\b/i,

  // ── Hindi / Hinglish ────────────────────────────────────────────────────
  /\b(weight|vajan|wajan)\b.{0,25}\b(loss|kam|lose|ghataana|ghatana|krna|karna|kaise|reduce)\b/i,
  /\b(weight|vajan|wajan)\b.{0,25}\b(gain|badhana|badhaaana|badhana|increase|banana)\b/i,
  /\b(motapa|mota)\b.{0,20}\b(hatana|kam|krna|karna|kaise|reduce|door)\b/i,
  /\b(patla|slim)\b.{0,15}\b(hona|kaise|krna|karna|chahta|chahti|banna|banana)\b/i,
  /\b(pet|tummy|belly)\b.{0,20}\b(kam|reduce|hatana|krna|karna|kaise|ghataana)\b/i,
  /\bpet kam\b/i,
  /\bvajan kam\b/i,
  /\bmotapa hatana\b/i,
  /\bpatla hona\b/i,
  /\b(muscle|muscles)\b.{0,20}\b(banana|badhana|banaana|krna|karna|kaise)\b/i,
  /\b(gym|exercise|workout|vyayam)\b.{0,20}\b(krna|karna|kaise|start|begin|plan|routine|chahiye)\b/i,
  /\b(diet plan|khana|khaana)\b.{0,20}\b(do|de|dena|batao|batana|kya|kaise|chahiye)\b/i,
  /\bkya khaye\b/i,
  /\bkya khaun\b/i,
  /\bkhana batao\b/i,
  // Goal suffix patterns — strongest Hindi goal signal
  /\b(loss|gain|kam|reduce|badhana)\b.{0,10}\b(krna hai|karna hai|karna chahta|karna chahti|chahiye)\b/i,
  /\b(krna hai|karna hai|karna chahta|karna chahti)\b.{0,30}\b(weight|vajan|motapa|patla|slim|fat|muscle)\b/i,
];

/** Medical knowledge / education questions. */
const MEDICAL_KNOWLEDGE_PATTERNS: RegExp[] = [
  // English question openers
  /^(what is|what are|what causes|what does|what happens|how does|how do|how is|how are)\b/i,
  /^(explain|tell me about|describe|define|can you explain|please explain)\b/i,
  /\b(symptoms of|causes of|treatment (of|for)|prevention (of|for)|cure (for|of)|types of|stages of|diagnosis of)\b/i,
  /\b(difference between|compare|versus|vs\.?)\b.{0,30}\b(disease|condition|syndrome|disorder|infection)\b/i,
  /\b(what (is|are|causes?|does)|how (does|is|are|do|can))\b.{0,40}\b(disease|condition|infection|disorder|virus|bacteria|cancer|syndrome)\b/i,
  // Pure knowledge questions (ends with ?)
  /^(?!(i have|i feel|i am feeling|mujhe|muje|mere ko|meri|ho raha|ho rahi)).{5,}[?]$/i,

  // Hindi knowledge phrases
  /\b(kya hai|kya hota hai|kya hote hain|kya hain)\b/i,
  /\b(kaise hota hai|kaise hoti hai|kyun hota hai|kyun hoti hai)\b/i,
  /\b(symptoms kya hain|lakshan kya hain|ilaj kya hai|dawa kya hai)\b/i,
  /\b(batao|samjhao|explain karo|bataiye)\b.{0,30}\b(kya|kyun|kaise|disease|bimari|infection)\b/i,
];

/** Symptom / distress language — person is experiencing something NOW. */
const SYMPTOM_DISTRESS_PATTERNS: RegExp[] = [
  // English distress openers
  /^(i have|i am having|i've been having|i'm having|i feel|i'm feeling|i've been feeling)\b/i,
  /^(suffering from|experiencing|feeling)\b/i,
  /\b(i have (had|been having)|since (yesterday|this morning|last night|today)|for (the past|\d+ day|\d+ hour|\d+ week))\b/i,
  /\b(getting worse|spreading|increasing|not going away|persisting)\b/i,
  /\b(\d+ days? (ago|back|since|of)|since \d+|for \d+ (days?|hours?|weeks?))\b/i,
  /\b(sudden(ly)?|severe|acute|unbearable|excruciating)\b.{0,30}\b(pain|ache|fever|cough|bleeding)\b/i,

  // Hindi distress openers
  /^(mujhe|muje|mere ko|meri)\b/i,
  /\b(ho raha hai|ho rahi hai|ho rhe hai|ho rahe hai|hota hai|hoti hai)\b/i,
  /\b(dard hai|dard ho raha|problem hai|takleef hai|bimari hai)\b/i,
  /\b(\d+ din se|kuch dino se|kal se|aaj se|subah se|raat se)\b/i,
  /\b(bahut dard|bahut takleef|bahut bukhaar|bahut khasi|bahut ulti)\b/i,
  /\b(dard|bukhar|khasi|ulti|chakkar|kamzori|sujan|jalan)\b.{0,10}\b(hai|ho raha|ho rahi|hua|hui)\b/i,
];

// ---------------------------------------------------------------------------
// Wellness AI prompt builder
// ---------------------------------------------------------------------------

/**
 * Builds a system prompt for the AI to respond as a wellness / lifestyle coach.
 * The AI must return structured JSON matching WellnessResponse.
 */
export function buildWellnessPrompt(userText: string): string {
  return `You are a certified wellness coach and nutritionist. The user has a health and lifestyle goal — NOT a medical symptom. Respond as a helpful wellness guide.

Respond in the SAME LANGUAGE the user wrote in (Hindi, English, or Hinglish).

Return ONLY valid JSON in this exact format:
{
  "category": "HEALTH_GOAL",
  "headline": "short title, e.g. Weight Loss Plan",
  "overview": "2–3 sentence motivating summary",
  "sections": [
    { "label": "Nutrition Tips", "emoji": "🥗", "points": ["tip 1", "tip 2", "tip 3", "tip 4"] },
    { "label": "Exercise Plan", "emoji": "🏃", "points": ["suggestion 1", "suggestion 2", "suggestion 3"] },
    { "label": "Lifestyle Changes", "emoji": "🌙", "points": ["change 1", "change 2", "change 3"] },
    { "label": "Realistic Timeline", "emoji": "📅", "points": ["e.g. 0.5–1 kg per week is healthy"] }
  ],
  "caution": "Important health note or when to pause",
  "doctor_advice": "When to consult a doctor instead",
  "disclaimer": "This is general wellness guidance only. Consult a healthcare professional before starting any new programme."
}

User message: ${userText}`;
}

/**
 * Builds a system prompt for the AI to respond as a medical educator.
 * The AI must return structured JSON matching WellnessResponse with category MEDICAL_KNOWLEDGE.
 */
export function buildEducationalPrompt(userText: string): string {
  return `You are a medical education specialist (like a friendly doctor explaining to a patient). The user is asking a medical knowledge question — they want to understand a health topic, NOT report symptoms.

Respond in the SAME LANGUAGE the user wrote in (Hindi, English, or Hinglish).

Return ONLY valid JSON in this exact format:
{
  "category": "MEDICAL_KNOWLEDGE",
  "headline": "short title, e.g. Understanding Diabetes",
  "overview": "2–3 sentence plain-language explanation",
  "sections": [
    { "label": "What It Is", "emoji": "📖", "points": ["fact 1", "fact 2"] },
    { "label": "Common Causes", "emoji": "🔍", "points": ["cause 1", "cause 2", "cause 3"] },
    { "label": "Symptoms to Watch", "emoji": "🩺", "points": ["symptom 1", "symptom 2"] },
    { "label": "Treatment Overview", "emoji": "💊", "points": ["treatment 1", "treatment 2"] },
    { "label": "Prevention", "emoji": "🛡️", "points": ["tip 1", "tip 2"] }
  ],
  "caution": "When this becomes serious / red flags",
  "doctor_advice": "When to see a doctor",
  "disclaimer": "This is educational information only and does not replace professional medical advice."
}

User message: ${userText}`;
}

// ---------------------------------------------------------------------------
// Core classifier
// ---------------------------------------------------------------------------

/**
 * Classify the user's message intent.
 *
 * Scoring rules:
 *  +5  per matched HEALTH_GOAL pattern (capped at 25)
 *  +4  if a detectPrimarySymptom keyword fires in the presence of distress language
 *  +3  per matched MEDICAL_KNOWLEDGE pattern (capped at 12)
 *  +2  per matched SYMPTOM_DISTRESS pattern (capped at 8)
 *  +4  if detectPrimarySymptom fires (symptom keyword present)
 *  -3  applied to SYMPTOM bucket when HEALTH_GOAL has a match (goal overrides ambiguous symptom words)
 */
export function classifyIntent(text: string): IntentResult {
  const lower = text.toLowerCase().trim();
  if (!lower) return { intent: "GENERAL", confidence: "low", label: "General" };

  let goalScore = 0;
  let knowledgeScore = 0;
  let symptomScore = 0;

  // ── Health goal signals ─────────────────────────────────────────────────
  for (const pattern of HEALTH_GOAL_PATTERNS) {
    if (pattern.test(lower)) {
      goalScore += 5;
      if (goalScore >= 25) break;
    }
  }

  // ── Medical knowledge signals ───────────────────────────────────────────
  for (const pattern of MEDICAL_KNOWLEDGE_PATTERNS) {
    if (pattern.test(lower)) {
      knowledgeScore += 3;
      if (knowledgeScore >= 12) break;
    }
  }

  // ── Symptom distress signals ────────────────────────────────────────────
  for (const pattern of SYMPTOM_DISTRESS_PATTERNS) {
    if (pattern.test(lower)) {
      symptomScore += 2;
      if (symptomScore >= 8) break;
    }
  }

  // ── Keyword-based symptom detection ────────────────────────────────────
  const detectedSymptom = detectPrimarySymptom(lower);
  if (detectedSymptom) {
    symptomScore += 4;
  }

  // ── Goal overrides ambiguous symptom words ──────────────────────────────
  // e.g. "weight loss" is in both health goal AND could be a loose symptom,
  // but goal context markers win.
  if (goalScore > 0) {
    symptomScore -= 3;
  }

  symptomScore = Math.max(symptomScore, 0);

  // ── Resolve intent ──────────────────────────────────────────────────────
  const maxScore = Math.max(goalScore, knowledgeScore, symptomScore);

  // Nothing matched at all
  if (maxScore === 0) {
    return { intent: "GENERAL", confidence: "low", label: "General" };
  }

  // Tie-breaking: HEALTH_GOAL > SYMPTOM_QUERY when scores are equal
  // (prevents accidental clinical triage for lifestyle messages)
  if (goalScore >= maxScore && goalScore > 0) {
    const confidence = goalScore >= 10 ? "high" : goalScore >= 5 ? "medium" : "low";
    return { intent: "HEALTH_GOAL", confidence, label: "Wellness & Lifestyle" };
  }

  // Knowledge question (ends with ? but no goal signal)
  if (knowledgeScore >= maxScore && knowledgeScore > 0) {
    const confidence = knowledgeScore >= 6 ? "high" : "medium";
    return { intent: "MEDICAL_KNOWLEDGE", confidence, label: "Medical Knowledge" };
  }

  // Symptom complaint
  if (symptomScore > 0) {
    const confidence = symptomScore >= 6 ? "high" : symptomScore >= 4 ? "medium" : "low";
    return { intent: "SYMPTOM_QUERY", confidence, label: "Symptom Assessment" };
  }

  return { intent: "GENERAL", confidence: "low", label: "General" };
}
