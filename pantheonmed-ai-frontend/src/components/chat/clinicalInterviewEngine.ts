/**
 * PantheonMed Clinical Interview Engine
 * ======================================
 * Implements a structured OPD-style question flow before diagnosis.
 * Pure TypeScript — no React dependencies.
 *
 * Pipeline:
 *   User text
 *   → detectPrimarySymptom()
 *   → createInterviewSession()
 *   → getNextQuestion() × N
 *   → isInterviewComplete() → buildDiagnosisContext()
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InterviewQuestion {
  id: string;
  question: string;
  options: string[];
  multiSelect?: boolean;        // allow multiple selections
  clinicalHint?: string;        // hint text shown under the question
  emergencyOptions?: string[];  // selecting these triggers emergency check
}

export interface InterviewSession {
  id: string;
  originalQuery: string;
  detectedSymptom: string;       // snake_case key into symptomQuestionTree
  symptomDisplayName: string;    // human-readable name
  questions: InterviewQuestion[];
  questionIndex: number;          // which question to show next
  answers: Record<string, string[]>; // questionId → selected options
  emergencyTriggered: boolean;
  emergencyReason?: string;
}

export interface EmergencyAlert {
  message: string;
  action: string;
}

// ---------------------------------------------------------------------------
// Symptom detection keywords
// ---------------------------------------------------------------------------

const SYMPTOM_KEYWORDS: [string, string, string[]][] = [
  // [symptomKey, displayName, keywords]
  ["chest_pain",          "Chest Pain",                ["chest pain","chest ache","chest tight","chest pressure","chest discomfort","heart pain","chest heavy","crushing chest"]],
  ["headache",            "Headache",                  ["headache","head pain","head ache","migraine","throbbing head","head hurts","head is pounding"]],
  ["abdominal_pain",      "Abdominal Pain",            ["stomach pain","belly pain","abdominal pain","tummy pain","stomach ache","gut pain","stomach cramp","epigastric pain"]],
  ["shortness_of_breath", "Shortness of Breath",       ["shortness of breath","can't breathe","cant breathe","breathlessness","difficulty breathing","breathing problem","breathless"]],
  ["fever",               "Fever",                     ["fever","high temperature","pyrexia","temperature","feeling hot","chills and fever","running a temperature"]],
  ["dizziness",           "Dizziness",                 ["dizzy","dizziness","vertigo","lightheaded","light headed","spinning","balance problem"]],
  ["cough",               "Cough",                     ["cough","coughing","persistent cough","dry cough","wet cough","productive cough","coughing up"]],
  ["back_pain",           "Back Pain",                 ["back pain","lower back","upper back","spine pain","backache","back ache","lumbar pain"]],
  ["fatigue",             "Fatigue / Weakness",        ["fatigue","tiredness","weakness","exhausted","always tired","no energy","lethargy","lethargic"]],
  ["joint_pain",          "Joint Pain",                ["joint pain","knee pain","hip pain","shoulder pain","wrist pain","arthritis","swollen joint","joint swelling"]],
  ["nausea",              "Nausea / Vomiting",         ["nausea","vomiting","nauseous","throwing up","feeling sick","want to vomit","stomach turning"]],
  ["palpitations",        "Palpitations",              ["palpitations","heart racing","racing heart","pounding heart","heart fluttering","irregular heartbeat","heart beat fast"]],
  ["urinary",             "Urinary Symptoms",          ["burning urination","frequent urination","painful urination","blood in urine","urinary pain","pee a lot","urine problem"]],
  ["skin_rash",           "Skin Rash",                 ["rash","skin rash","itching","hives","skin spots","skin redness","blisters","red spots"]],
  ["swelling",            "Swelling / Oedema",         ["swelling","swollen","oedema","edema","puffy","swollen legs","ankle swelling","leg swelling"]],
];

// ---------------------------------------------------------------------------
// Question trees
// ---------------------------------------------------------------------------

const symptomQuestionTree: Record<string, InterviewQuestion[]> = {

  chest_pain: [
    {
      id: "location",
      question: "Where exactly is the chest pain located?",
      options: ["Center of chest", "Left side of chest", "Right side", "Upper abdomen / below sternum"],
      clinicalHint: "Location helps distinguish cardiac, respiratory, and GI causes.",
    },
    {
      id: "character",
      question: "How would you describe the pain?",
      options: ["Pressure or squeezing", "Sharp, stabbing", "Burning", "Tightness or heaviness", "Dull aching"],
      clinicalHint: "Character of pain is an important diagnostic clue.",
      emergencyOptions: ["Pressure or squeezing", "Tightness or heaviness"],
    },
    {
      id: "duration",
      question: "How long has the pain been present?",
      options: ["Less than 5 minutes", "5–30 minutes", "30 minutes to a few hours", "Several hours or days"],
      emergencyOptions: ["5–30 minutes", "30 minutes to a few hours"],
    },
    {
      id: "associated",
      question: "Do you have any of these additional symptoms?",
      options: ["Sweating", "Shortness of breath", "Nausea or vomiting", "Pain spreading to arm or jaw", "Dizziness / light-headedness", "None of these"],
      multiSelect: true,
      emergencyOptions: ["Sweating", "Shortness of breath", "Pain spreading to arm or jaw"],
      clinicalHint: "Associated symptoms significantly influence the diagnosis.",
    },
    {
      id: "risk_factors",
      question: "Do you have any of these risk factors?",
      options: ["Diabetes", "High blood pressure", "Smoking", "Known heart disease", "High cholesterol", "Family history of heart attack", "None of these"],
      multiSelect: true,
    },
  ],

  headache: [
    {
      id: "onset",
      question: "How did the headache start?",
      options: ["Came on suddenly (like a thunderclap)", "Gradually got worse over hours", "Woke up with it", "Started after an injury"],
      emergencyOptions: ["Came on suddenly (like a thunderclap)"],
      clinicalHint: "Sudden onset 'thunderclap' headache can indicate subarachnoid haemorrhage.",
    },
    {
      id: "location_head",
      question: "Where is the headache?",
      options: ["Whole head", "One side only (left or right)", "Forehead / behind eyes", "Back of head / neck"],
    },
    {
      id: "character_head",
      question: "What does the headache feel like?",
      options: ["Throbbing / pulsating", "Constant dull pressure", "Stabbing / electric shocks", "Tightness around the head"],
    },
    {
      id: "associated_head",
      question: "Do you have any of these symptoms with the headache?",
      options: ["Nausea or vomiting", "Sensitivity to light", "Neck stiffness", "Fever", "Confusion / difficulty speaking", "Visual disturbances", "None of these"],
      multiSelect: true,
      emergencyOptions: ["Neck stiffness", "Fever", "Confusion / difficulty speaking"],
      clinicalHint: "Neck stiffness + fever + headache = possible meningitis.",
    },
    {
      id: "severity",
      question: "How severe is the headache on a scale of 1–10?",
      options: ["1–3 (Mild — does not affect daily activities)", "4–6 (Moderate — limits some activities)", "7–9 (Severe — can't function normally)", "10 (Worst headache of my life)"],
      emergencyOptions: ["10 (Worst headache of my life)"],
    },
  ],

  abdominal_pain: [
    {
      id: "location_abd",
      question: "Where is the abdominal pain located?",
      options: ["Upper middle (epigastric)", "Right upper quadrant", "Left upper quadrant", "Around the navel", "Right lower abdomen", "Left lower abdomen", "All over the abdomen"],
      clinicalHint: "Right lower pain may indicate appendicitis.",
      emergencyOptions: ["Right lower abdomen"],
    },
    {
      id: "character_abd",
      question: "What does the pain feel like?",
      options: ["Crampy, comes and goes", "Constant dull ache", "Sharp stabbing", "Burning / gnawing", "Colicky (very severe, comes in waves)"],
    },
    {
      id: "timing_abd",
      question: "Is the pain related to eating?",
      options: ["Gets worse after eating", "Relieved by eating", "No relation to food", "Worse on empty stomach"],
      clinicalHint: "Relationship to meals helps diagnose peptic ulcer, GERD, gallstones.",
    },
    {
      id: "associated_abd",
      question: "Do you have any of these symptoms?",
      options: ["Nausea or vomiting", "Fever", "Loss of appetite", "Diarrhoea", "Constipation", "Blood in stool", "Jaundice (yellow eyes/skin)", "None"],
      multiSelect: true,
      emergencyOptions: ["Fever", "Blood in stool", "Jaundice (yellow eyes/skin)"],
    },
    {
      id: "duration_abd",
      question: "How long have you had this pain?",
      options: ["Started today (< 12 hours)", "1–3 days", "More than 3 days", "Comes and goes for weeks"],
    },
  ],

  shortness_of_breath: [
    {
      id: "onset_breath",
      question: "How did the breathlessness start?",
      options: ["Suddenly (within minutes)", "Over hours", "Gradually over days", "Has been present for a long time"],
      emergencyOptions: ["Suddenly (within minutes)"],
    },
    {
      id: "context_breath",
      question: "When does the breathlessness occur?",
      options: ["At rest, even when not moving", "With mild activity (walking slowly)", "Only with exertion", "Worse when lying flat", "Worse at night"],
      emergencyOptions: ["At rest, even when not moving"],
      clinicalHint: "Breathlessness at rest or when lying flat may indicate heart failure.",
    },
    {
      id: "associated_breath",
      question: "What other symptoms do you have?",
      options: ["Chest pain", "Cough", "Wheezing", "Leg swelling", "Coughing blood", "Palpitations", "Fever", "None"],
      multiSelect: true,
      emergencyOptions: ["Chest pain", "Coughing blood"],
    },
    {
      id: "history_breath",
      question: "Do you have any of these conditions?",
      options: ["Asthma or COPD", "Heart disease", "Recent surgery or long travel", "COVID-19 recently", "Smoking history", "None"],
      multiSelect: true,
    },
  ],

  fever: [
    {
      id: "temp",
      question: "How high is the temperature?",
      options: ["Low-grade (99–100°F / 37–38°C)", "Moderate (100–103°F / 38–39°C)", "High (> 103°F / > 39°C)", "Not measured but feeling very hot"],
      emergencyOptions: ["High (> 103°F / > 39°C)"],
    },
    {
      id: "duration_fever",
      question: "How many days have you had the fever?",
      options: ["Less than 1 day", "1–3 days", "4–7 days", "More than 1 week"],
      emergencyOptions: ["More than 1 week"],
    },
    {
      id: "pattern",
      question: "What is the fever pattern?",
      options: ["Continuous (doesn't go away)", "Intermittent (comes and goes daily)", "Cyclical (every 2–3 days)", "Mainly evenings / nights"],
      clinicalHint: "Cyclical fever may indicate malaria.",
    },
    {
      id: "associated_fever",
      question: "Do you have any of these with the fever?",
      options: ["Chills and rigors (shivering)", "Severe headache", "Body and muscle aches", "Rash", "Bleeding (gums, skin)", "Neck stiffness", "Diarrhoea", "None"],
      multiSelect: true,
      emergencyOptions: ["Bleeding (gums, skin)", "Neck stiffness", "Rash"],
      clinicalHint: "Fever + bleeding + rash may indicate dengue.",
    },
  ],

  dizziness: [
    {
      id: "type_dizziness",
      question: "How would you describe the dizziness?",
      options: ["Room spinning around me (vertigo)", "Feeling lightheaded / about to faint", "Unsteady, loss of balance", "Floating sensation"],
    },
    {
      id: "trigger",
      question: "When does the dizziness happen?",
      options: ["When I stand up quickly", "When I turn my head", "All the time, even at rest", "Only when walking", "After eating"],
    },
    {
      id: "associated_dizziness",
      question: "Do you also have any of these?",
      options: ["Nausea or vomiting", "Hearing loss or ringing in ears", "Headache", "Vision changes / double vision", "Weakness in face, arm, or leg", "Loss of consciousness", "None"],
      multiSelect: true,
      emergencyOptions: ["Weakness in face, arm, or leg", "Loss of consciousness", "Vision changes / double vision"],
      clinicalHint: "Dizziness with limb weakness or facial drooping may indicate stroke.",
    },
    {
      id: "medications",
      question: "Are you currently taking any medications?",
      options: ["Blood pressure medications", "Diabetes medications", "Antidepressants / sedatives", "Multiple medications", "No medications"],
    },
  ],

  cough: [
    {
      id: "type_cough",
      question: "What type of cough do you have?",
      options: ["Dry cough (no phlegm)", "Productive (bringing up phlegm)", "Coughing up blood", "Barking / whooping cough"],
      emergencyOptions: ["Coughing up blood"],
    },
    {
      id: "phlegm",
      question: "If you have phlegm, what colour is it?",
      options: ["Clear / white", "Yellow or green", "Brown or rust-coloured", "No phlegm"],
      clinicalHint: "Yellow/green phlegm suggests infection; rust-coloured may indicate pneumonia.",
    },
    {
      id: "duration_cough",
      question: "How long have you had this cough?",
      options: ["Less than 1 week", "1–3 weeks", "More than 3 weeks", "Several months"],
      emergencyOptions: ["More than 3 weeks"],
      clinicalHint: "Cough > 3 weeks requires evaluation for TB or lung disease.",
    },
    {
      id: "associated_cough",
      question: "Do you have any of these with the cough?",
      options: ["Fever", "Shortness of breath", "Chest pain", "Night sweats", "Weight loss", "Wheezing", "None"],
      multiSelect: true,
      emergencyOptions: ["Shortness of breath", "Chest pain"],
    },
  ],

  back_pain: [
    {
      id: "location_back",
      question: "Where exactly is the back pain?",
      options: ["Lower back (below waist)", "Mid-back (between shoulders)", "Upper back / neck", "Side of back (flank)"],
    },
    {
      id: "onset_back",
      question: "How did the back pain start?",
      options: ["After lifting or twisting", "After an accident or fall", "Came on gradually with no clear cause", "After prolonged sitting / poor posture", "Woke up with it"],
    },
    {
      id: "radiation",
      question: "Does the pain spread anywhere?",
      options: ["Down the leg (below the knee)", "Into the groin or lower abdomen", "Around to the front of the body", "Stays localised in the back"],
      emergencyOptions: ["Down the leg (below the knee)"],
      clinicalHint: "Radiation to leg suggests disc herniation / sciatica.",
    },
    {
      id: "associated_back",
      question: "Do you have any of these symptoms?",
      options: ["Weakness or numbness in legs", "Difficulty urinating / bowel problems", "Fever", "Unexplained weight loss", "Pain worse at night / rest", "None"],
      multiSelect: true,
      emergencyOptions: ["Weakness or numbness in legs", "Difficulty urinating / bowel problems"],
      clinicalHint: "Bladder/bowel involvement = possible cauda equina — EMERGENCY.",
    },
  ],

  fatigue: [
    {
      id: "pattern_fatigue",
      question: "How would you describe your tiredness?",
      options: ["Tired all the time, even after sleeping", "Tired only after activity", "Gets worse throughout the day", "Better in the morning, worse by evening"],
    },
    {
      id: "duration_fatigue",
      question: "How long have you been experiencing this fatigue?",
      options: ["Less than 2 weeks", "2–4 weeks", "1–3 months", "More than 3 months"],
    },
    {
      id: "associated_fatigue",
      question: "Do you have any of these with the fatigue?",
      options: ["Weight loss", "Weight gain", "Fever or night sweats", "Breathlessness on exertion", "Low mood / depression", "Hair loss", "Cold intolerance", "None"],
      multiSelect: true,
    },
    {
      id: "lifestyle",
      question: "Which of these apply to you?",
      options: ["Poor sleep (< 6 hours)", "High stress levels", "Poor diet or low iron", "Diabetes or thyroid problem", "Recently started new medication", "None of these"],
      multiSelect: true,
    },
  ],

  nausea: [
    {
      id: "trigger_nausea",
      question: "When does the nausea occur?",
      options: ["Mostly in the morning", "After eating", "Throughout the day", "After taking medication", "Triggered by motion / travel"],
    },
    {
      id: "vomiting",
      question: "Are you vomiting?",
      options: ["Yes, multiple times", "Yes, once or twice", "Just nausea, no vomiting", "Vomited blood or coffee-ground material"],
      emergencyOptions: ["Vomited blood or coffee-ground material"],
    },
    {
      id: "associated_nausea",
      question: "What other symptoms do you have?",
      options: ["Abdominal pain", "Fever", "Diarrhoea", "Headache", "Dizziness", "None"],
      multiSelect: true,
    },
    {
      id: "pregnancy_status",
      question: "Could you be pregnant? (For females of reproductive age)",
      options: ["Yes / possibly", "No", "Not applicable"],
    },
  ],

  palpitations: [
    {
      id: "character_palp",
      question: "How do the palpitations feel?",
      options: ["Racing heartbeat (fast)", "Fluttering or flip-flop feeling", "Pounding strongly", "Irregular or skipping beats"],
    },
    {
      id: "duration_palp",
      question: "How long do episodes last?",
      options: ["Seconds only", "A few minutes", "10 minutes or longer", "Continuous"],
      emergencyOptions: ["10 minutes or longer", "Continuous"],
    },
    {
      id: "triggers",
      question: "What triggers the palpitations?",
      options: ["Exercise or physical activity", "Stress or anxiety", "Caffeine (tea/coffee)", "Happen at rest for no reason", "After lying down"],
      emergencyOptions: ["Happen at rest for no reason"],
    },
    {
      id: "associated_palp",
      question: "Do you also have any of these?",
      options: ["Chest pain", "Shortness of breath", "Dizziness or fainting", "None of these"],
      multiSelect: true,
      emergencyOptions: ["Chest pain", "Shortness of breath", "Dizziness or fainting"],
    },
  ],

  joint_pain: [
    {
      id: "joint_site",
      question: "Which joints are affected?",
      options: ["Knee(s)", "Hips", "Small joints (fingers/wrists/toes)", "Shoulder(s)", "Ankle(s)", "Multiple joints"],
      multiSelect: true,
    },
    {
      id: "joint_swelling",
      question: "Is the joint swollen, red, or warm?",
      options: ["Yes — very swollen and hot", "Mild swelling only", "Red and warm without much swelling", "No swelling"],
      emergencyOptions: ["Yes — very swollen and hot"],
    },
    {
      id: "pattern_joint",
      question: "How does the pain behave?",
      options: ["Worse in the morning, improves with movement", "Worse with activity, better with rest", "Constant, no change", "Comes and goes unpredictably"],
    },
    {
      id: "onset_joint",
      question: "Did anything precede the joint pain?",
      options: ["Recent infection (throat, gut, urinary)", "Injury or trauma", "Nothing in particular", "Long-standing (years)", "Started after a new medication"],
    },
  ],

  urinary: [
    {
      id: "symptom_urinary",
      question: "What urinary symptoms do you have?",
      options: ["Burning or pain when urinating", "Urinating very frequently", "Urgent need to urinate", "Blood in urine", "Difficulty starting / weak stream"],
      multiSelect: true,
      emergencyOptions: ["Blood in urine"],
    },
    {
      id: "location_urinary",
      question: "Do you have any pain?",
      options: ["Lower abdominal / pelvic pain", "Flank / side pain (near kidney)", "No pain", "Pain at the tip of the urethra only"],
      emergencyOptions: ["Flank / side pain (near kidney)"],
    },
    {
      id: "systemic",
      question: "Do you also have any of these?",
      options: ["Fever or chills", "Nausea or vomiting", "No additional symptoms"],
      emergencyOptions: ["Fever or chills"],
      clinicalHint: "Fever + flank pain may indicate pyelonephritis.",
    },
    {
      id: "context_urinary",
      question: "Which of these apply to you?",
      options: ["Female", "Male", "Recent sexual activity", "Pregnancy", "Known kidney stones", "Diabetes", "Urinary catheter in place"],
      multiSelect: true,
    },
  ],

  skin_rash: [
    {
      id: "appearance",
      question: "What does the rash look like?",
      options: ["Red flat patches", "Raised bumps or hives", "Blisters or fluid-filled", "Tiny red/purple spots (petechiae)", "Dry, scaly, or crusty"],
      emergencyOptions: ["Tiny red/purple spots (petechiae)"],
      clinicalHint: "Petechiae (tiny purple spots that don't fade with pressure) can indicate meningococcal infection.",
    },
    {
      id: "distribution",
      question: "Where is the rash?",
      options: ["Face and neck only", "Trunk (chest and back)", "Arms and legs", "Widespread all over body", "Only at one spot"],
    },
    {
      id: "associated_rash",
      question: "Do you have any of these with the rash?",
      options: ["Fever", "Itching", "Joint pain", "Difficulty breathing", "Recent new medication", "None"],
      multiSelect: true,
      emergencyOptions: ["Difficulty breathing"],
    },
  ],

  swelling: [
    {
      id: "location_swelling",
      question: "Where is the swelling?",
      options: ["Both legs / ankles", "One leg only", "Face or around eyes", "Abdomen", "Hands and fingers"],
      emergencyOptions: ["Face or around eyes"],
    },
    {
      id: "onset_swelling",
      question: "How did the swelling develop?",
      options: ["Suddenly (over hours)", "Gradually over days to weeks", "Been there for months", "Gets worse during the day, better overnight"],
    },
    {
      id: "associated_swelling",
      question: "Do you have any of these symptoms?",
      options: ["Shortness of breath", "Calf pain or redness (one leg)", "Reduced urine output", "Puffy face in the morning", "None"],
      multiSelect: true,
      emergencyOptions: ["Shortness of breath", "Calf pain or redness (one leg)"],
    },
  ],
};

// Fallback tree for unrecognised symptoms
const genericTree: InterviewQuestion[] = [
  {
    id: "severity_gen",
    question: "How severe is your symptom on a scale of 1–10?",
    options: ["1–3 (Mild)", "4–6 (Moderate)", "7–9 (Severe)", "10 (Unbearable)"],
    emergencyOptions: ["10 (Unbearable)"],
  },
  {
    id: "duration_gen",
    question: "How long have you had this symptom?",
    options: ["Less than 24 hours", "1–3 days", "4–7 days", "More than 1 week"],
  },
  {
    id: "associated_gen",
    question: "Do you have any other symptoms along with this?",
    options: ["Fever", "Chest pain", "Shortness of breath", "Severe pain", "None of these"],
    multiSelect: true,
    emergencyOptions: ["Chest pain", "Shortness of breath", "Severe pain"],
  },
];

// ---------------------------------------------------------------------------
// Emergency rule library
// ---------------------------------------------------------------------------

interface EmergencyRule {
  symptom: string;       // symptomKey or "*"
  questionId: string;
  answers: string[];     // if any of these are selected
  alert: EmergencyAlert;
}

const EMERGENCY_RULES: EmergencyRule[] = [
  {
    symptom: "chest_pain",
    questionId: "associated",
    answers: ["Sweating", "Shortness of breath", "Pain spreading to arm or jaw"],
    alert: {
      message: "⚠️ Your symptom combination (chest pain + these symptoms) may indicate a heart attack.",
      action: "Call 112 immediately. Chew aspirin 325mg if available and not allergic.",
    },
  },
  {
    symptom: "chest_pain",
    questionId: "character",
    answers: ["Pressure or squeezing", "Tightness or heaviness"],
    alert: {
      message: "⚠️ Crushing or pressure-like chest pain is a classic warning sign of a cardiac event.",
      action: "Do not ignore this. Stop activity, sit down, and call 112 if pain persists > 5 minutes.",
    },
  },
  {
    symptom: "headache",
    questionId: "onset",
    answers: ["Came on suddenly (like a thunderclap)"],
    alert: {
      message: "🚨 Sudden onset 'thunderclap' headache is a medical emergency.",
      action: "This may indicate a subarachnoid haemorrhage. Call 112 immediately.",
    },
  },
  {
    symptom: "headache",
    questionId: "associated_head",
    answers: ["Neck stiffness", "Confusion / difficulty speaking"],
    alert: {
      message: "🚨 Headache + neck stiffness or confusion may indicate bacterial meningitis.",
      action: "Call 112 immediately. Do not wait.",
    },
  },
  {
    symptom: "dizziness",
    questionId: "associated_dizziness",
    answers: ["Weakness in face, arm, or leg", "Vision changes / double vision"],
    alert: {
      message: "🚨 Dizziness + limb weakness or vision changes may indicate stroke (FAST criteria).",
      action: "Call 112 immediately. Time is brain — every minute counts.",
    },
  },
  {
    symptom: "shortness_of_breath",
    questionId: "onset_breath",
    answers: ["Suddenly (within minutes)"],
    alert: {
      message: "⚠️ Sudden onset breathlessness may indicate pulmonary embolism, pneumothorax, or severe asthma.",
      action: "Seek emergency medical care immediately.",
    },
  },
  {
    symptom: "back_pain",
    questionId: "associated_back",
    answers: ["Difficulty urinating / bowel problems", "Weakness or numbness in legs"],
    alert: {
      message: "🚨 Back pain with bladder/bowel problems or leg weakness may indicate cauda equina syndrome.",
      action: "This is a surgical emergency. Go to A&E immediately.",
    },
  },
  {
    symptom: "fever",
    questionId: "associated_fever",
    answers: ["Bleeding (gums, skin)", "Neck stiffness"],
    alert: {
      message: "🚨 Fever with bleeding signs or neck stiffness requires immediate evaluation.",
      action: "Go to emergency or call 112. May indicate dengue or meningitis.",
    },
  },
  {
    symptom: "*",
    questionId: "*",
    answers: ["Chest pain", "Coughing up blood", "Vomited blood or coffee-ground material"],
    alert: {
      message: "⚠️ This symptom combination requires urgent medical attention.",
      action: "Please go to the emergency department or call 112.",
    },
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Detect the primary symptom key from free text. Returns null if no match. */
export function detectPrimarySymptom(text: string): { key: string; displayName: string } | null {
  const lower = text.toLowerCase();
  for (const [key, displayName, keywords] of SYMPTOM_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return { key, displayName };
    }
  }
  return null;
}

/**
 * Return true if this message looks like a clinical symptom complaint.
 *
 * Rules (in order):
 * 1. Empty string → false
 * 2. Greetings / questions / acknowledgements → false
 * 3. Known symptom keyword detected → true  (no word-count minimum)
 * 4. Otherwise → false
 *
 * NOTE: The old `< 3 word` minimum was intentionally removed because common
 * entries like "chest pain" (2 words) or "headache" (1 word) must trigger
 * the Clinical Interview Engine.
 */
export function isClinicalComplaint(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return false;

  const skipPatterns = [
    /^(hi|hello|hey|good\s)/,
    /^(what|how|when|where|why|can you|tell me|explain|is |are |does |do )/,
    /^(thank|thanks|ok|okay|yes|no|i see|got it|sure|great)/,
    /\?$/,
  ];
  if (skipPatterns.some((p) => p.test(lower))) return false;

  return detectPrimarySymptom(lower) !== null;
}

/** Create a new interview session for the detected symptom. */
export function createInterviewSession(
  originalQuery: string,
  symptomKey: string,
  displayName: string,
): InterviewSession {
  const questions = symptomQuestionTree[symptomKey] ?? genericTree;
  return {
    id: crypto.randomUUID(),
    originalQuery,
    detectedSymptom: symptomKey,
    symptomDisplayName: displayName,
    questions,
    questionIndex: 0,
    answers: {},
    emergencyTriggered: false,
  };
}

/** Get the next question to ask, or null if the interview is done. */
export function getNextQuestion(session: InterviewSession): InterviewQuestion | null {
  if (session.questionIndex >= session.questions.length) return null;
  return session.questions[session.questionIndex];
}

/** Minimum questions before diagnosis runs. */
const MIN_ANSWERS = 3;

/** True when enough answers have been collected to run diagnosis. */
export function isInterviewComplete(session: InterviewSession): boolean {
  const answered = Object.keys(session.answers).length;
  return answered >= MIN_ANSWERS || session.questionIndex >= session.questions.length;
}

/** Record an answer and advance the question index. Returns the updated session. */
export function recordAnswer(
  session: InterviewSession,
  questionId: string,
  selectedOptions: string[],
): InterviewSession {
  return {
    ...session,
    answers: { ...session.answers, [questionId]: selectedOptions },
    questionIndex: session.questionIndex + 1,
  };
}

/** Check if the latest answer triggers any emergency rules. Returns alert or null. */
export function checkEmergency(
  session: InterviewSession,
  questionId: string,
  selectedOptions: string[],
): EmergencyAlert | null {
  const matched = EMERGENCY_RULES.filter((rule) => {
    const symptomMatch = rule.symptom === "*" || rule.symptom === session.detectedSymptom;
    const questionMatch = rule.questionId === "*" || rule.questionId === questionId;
    const optionMatch = rule.answers.some((a) => selectedOptions.includes(a));
    return symptomMatch && questionMatch && optionMatch;
  });
  return matched[0]?.alert ?? null;
}

/** Build a rich clinical context string to inject into the AI prompt. */
export function buildDiagnosisContext(session: InterviewSession): string {
  const lines: string[] = [
    `CLINICAL INTERVIEW SUMMARY`,
    `Patient complaint: ${session.originalQuery}`,
    `Primary symptom identified: ${session.symptomDisplayName}`,
    ``,
    `Structured clinical answers:`,
  ];

  for (const [qId, answers] of Object.entries(session.answers)) {
    const question = session.questions.find((q) => q.id === qId);
    const qText = question?.question ?? qId;
    lines.push(`  • ${qText} → ${answers.join(", ")}`);
  }

  if (session.emergencyTriggered && session.emergencyReason) {
    lines.push(``, `⚠️ EMERGENCY FLAG: ${session.emergencyReason}`);
  }

  lines.push(``, `Please generate a full clinical assessment based on the above structured intake.`);
  return lines.join("\n");
}

/** Human-readable intro message for starting the interview. */
export function buildInterviewIntro(displayName: string): string {
  return `I can see you're experiencing **${displayName}**. To give you the most accurate clinical assessment, I need to ask you a few targeted questions — just like a doctor would during a consultation.\n\nPlease select the option that best matches your situation.`;
}

/** Human-readable transition message after all answers collected. */
export function buildTransitionMessage(session: InterviewSession): string {
  const count = Object.keys(session.answers).length;
  return `Thank you for answering ${count} question${count === 1 ? "" : "s"}. Analysing your responses now and generating a clinical assessment...`;
}
