// Modular Prompt System for Strudel AI
// Separated concerns for maintainability

/**
 * Core system identity - minimal and focused
 */
export const SYSTEM_BASE = `You generate Strudel live coding music. Output ONLY:
1. Brief description (1 line)
2. \`\`\`javascript code block with closing \`\`\`

NEVER output tutorials, explanations, Chinese text, or npm/React code.`;

/**
 * Code formatting rules - CRITICAL for readable output
 */
export const FORMATTING_RULES = `
CODE FORMAT (MANDATORY):
Every $: pattern MUST use multi-line format with 3-space indentation:

$: note("0 3 5 7")
   .scale("a:minor")
   .s("sine")
   .lpf(2500)
   .gain(0.4)
   ._pianoroll()

RULES:
- First line: $: followed by the main function (s(), note(), etc.)
- Each method on its OWN LINE with 3-space indent
- NO closing parenthesis after the chain
- setcps() goes at the top, alone on its line
- Add // comments above each pattern layer

NEVER write long single-line chains like:
$: note("...").scale("...").s("...").lpf(2000).gain(0.4)._pianoroll()

PATTERN LENGTH RULES:
- Keep note patterns SHORT: 4-8 notes max per pattern
- Use <> alternation for variation: "<[0 3 5 7] [5 7 9 7]>"
- NEVER write 16+ notes in a single pattern string
- Bad: note("0 3 5 7 5 3 0 3 5 7 5 3 0 3 5 7")
- Good: note("<[0 3 5 7] [5 3 0 3]>").slow(2)`;

/**
 * Sound design and mixing rules
 */
export const SOUND_DESIGN = `
SOUND DESIGN (MANDATORY):

GAIN STAGING:
- Kick: 0.80-0.90 (loudest element)
- Snare/Clap: 0.55-0.70
- Hats: 0.15-0.25 (quiet! hats should whisper)
- Bass: 0.45-0.60
- Lead: 0.35-0.50
- Pads: 0.15-0.25
- Arps: 0.20-0.35

FILTER RULES (CRITICAL):
- ALL synths need .lpf() - raw oscillators sound harsh!
- Hats: ALWAYS .hpf(6000) minimum - keep them out of the way
- Bass: ALWAYS .lpf(200-400) - don't clash with kick
- Leads: .lpf(2000-4000) - tame the highs
- Pads: .lpf(800-1500) - warm and distant

FILTER ENVELOPES (for plucky/alive sounds):
- .lpenv(depth) - how much filter opens (2-6 typical)
- .lpd(decay) - how fast it closes (0.1-0.3 for plucks)
- .lpa(attack) - filter attack time
- Combo: .lpf(800).lpenv(4).lpd(0.2) = punchy pluck

FM SYNTHESIS (for character):
- .fm(index) - FM amount (1-4 subtle, 4-8 aggressive)
- .fmh(ratio) - harmonic ratio (1, 1.5, 2 common)
- .fmdecay(time) - FM envelope decay
- Pluck recipe: .fm(3).fmh(2).fmdecay(0.1)

REVERB & SPACE:
- Kick: .room(0.05-0.15) - minimal, keep it tight
- Hats: .room(0.2-0.4) - some air
- Lead: .room(0.3-0.5) - space but present
- Pads: .room(0.5-0.8) - wash them out

DELAY (for movement):
- .delay(amount) - wet/dry (0.2-0.5)
- .delaytime(time) - in seconds (0.375 = dotted 8th at 120bpm)
- .delayfeedback(fb) - repeats (0.3-0.6)`;

/**
 * Genre-specific guidelines for Melodic Techno
 */
export const MELODIC_TECHNO_STYLE = `
MELODIC TECHNO STYLE (Anyma, ARTBAT, Tale of Us):

TEMPO: 120-126 BPM (setcps(122/60/4) typical)

DRUMS:
- Kick: Four-on-floor, RolandTR909, tight and punchy
- Hats: Sparse, offbeat or subtle 8ths, HIGH PASSED
- Clap/Rim: On 2 and 4, with reverb tail
- NO busy drum patterns - space is key

BASS:
- Minimal, often just root notes
- Sine or filtered saw
- Follow chord roots
- Side-chain feel (use gain patterns)

LEADS (the signature element):
- FM synthesis with filter envelope
- Emotional minor melodies (a:minor, d:minor, e:minor)
- Use ACTUAL MELODIES not just arpeggios
- Delay (dotted 8th) and reverb essential
- Rise and fall, call and response

PADS:
- Slow attack, long release
- Filtered saw or triangle
- Moving filter (sine.range().slow())
- Very quiet in mix (0.15-0.2)

ARPS (background texture):
- Simple 4-note patterns
- Heavily delayed
- Filtered, not prominent
- Support, don't lead

STRUCTURE:
- Hypnotic, repetitive foundation
- Lead melody provides movement
- Build tension with filter sweeps
- Less is more`;

/**
 * Context awareness rules for different intents
 */
export const CONTEXT_ADD = `
ADD MODE - Output ONLY the new element requested.
The user has existing code. Do NOT:
- Repeat setcps() (tempo already set)
- Repeat existing drum patterns
- Output a full track

DO:
- Output ONLY the new pattern layer
- Match the existing key/scale if mentioned
- Use complementary gain levels
- Add a comment describing the new layer`;

export const CONTEXT_MODIFY = `
MODIFY MODE - Output the modified version of existing code.
Keep the overall structure but apply the requested changes.
Output the COMPLETE modified code, not just the changed parts.`;

export const CONTEXT_CREATE = `
CREATE MODE - Generate a complete track.
Include:
- setcps() for tempo
- Kick pattern
- Hat/percussion pattern
- Bass line
- Lead melody or arp
- Use proper gain staging throughout`;

/**
 * Intent classification patterns
 */
const INTENT_PATTERNS = {
  create: /\b(make|create|generate|build|compose|write|new|start|give me)\b/i,
  add: /\b(add|include|layer|put in|also|throw in|need|want)\b/i,
  modify: /\b(change|modify|adjust|tweak|make it|more|less|faster|slower|different)\b/i,
  fix: /\b(fix|broken|error|not working|wrong|issue|problem|bug)\b/i
};

/**
 * Classify user intent based on message and context
 */
export function classifyIntent(message, currentCode = '') {
  const hasCode = currentCode?.trim().length > 50;
  const msg = message.toLowerCase();

  // Fix intent takes priority
  if (INTENT_PATTERNS.fix.test(msg)) return 'fix';

  // Modify existing code
  if (INTENT_PATTERNS.modify.test(msg) && hasCode) return 'modify';

  // Add to existing code
  if (INTENT_PATTERNS.add.test(msg) && hasCode) return 'add';

  // Default to create for new tracks
  return 'create';
}

/**
 * Genre detection from user message
 */
export function detectGenre(message) {
  const msg = message.toLowerCase();

  if (/melodic\s*techno|anyma|artbat|tale\s*of\s*us|afterlife/i.test(msg)) {
    return 'melodic-techno';
  }
  if (/house|disco|funky/i.test(msg)) return 'house';
  if (/techno|industrial|hard|dark/i.test(msg)) return 'techno';
  if (/dnb|drum\s*(and|&|n)\s*bass|jungle/i.test(msg)) return 'dnb';
  if (/ambient|chill|relax|atmospheric/i.test(msg)) return 'ambient';
  if (/trance|euphoric|uplifting/i.test(msg)) return 'trance';

  // Default to melodic techno (user preference)
  return 'melodic-techno';
}

/**
 * Parse existing code to extract context
 */
export function parseExistingCode(code) {
  if (!code?.trim()) return null;

  const context = {
    tempo: null,
    scale: null,
    layers: []
  };

  // Extract tempo
  const tempoMatch = code.match(/setcps\((\d+)\/60\/4\)/);
  if (tempoMatch) {
    context.tempo = parseInt(tempoMatch[1]);
  }

  // Extract scale
  const scaleMatch = code.match(/\.scale\(["']([^"']+)["']\)/);
  if (scaleMatch) {
    context.scale = scaleMatch[1];
  }

  // Extract layer types from comments
  const commentMatches = code.matchAll(/\/\/\s*(.+)/g);
  for (const match of commentMatches) {
    const comment = match[1].toLowerCase();
    if (/kick|bd/.test(comment)) context.layers.push('kick');
    if (/hat|hh/.test(comment)) context.layers.push('hats');
    if (/snare|sd|clap|cp/.test(comment)) context.layers.push('snare');
    if (/bass/.test(comment)) context.layers.push('bass');
    if (/lead|melody/.test(comment)) context.layers.push('lead');
    if (/pad/.test(comment)) context.layers.push('pad');
    if (/arp/.test(comment)) context.layers.push('arp');
  }

  return context;
}

/**
 * Build the complete prompt from components
 */
export function buildPrompt(request, currentCode, knowledge, intent, genre) {
  const parts = [SYSTEM_BASE];

  // Always include formatting and sound design
  parts.push(FORMATTING_RULES);
  parts.push(SOUND_DESIGN);

  // Add genre-specific guidelines
  if (genre === 'melodic-techno') {
    parts.push(MELODIC_TECHNO_STYLE);
  }

  // Add context-specific instructions
  if (intent === 'add') {
    parts.push(CONTEXT_ADD);
    const existing = parseExistingCode(currentCode);
    if (existing) {
      parts.push(`\nEXISTING CONTEXT:
- Tempo: ${existing.tempo || 'not set'} BPM
- Scale: ${existing.scale || 'not detected'}
- Layers present: ${existing.layers.join(', ') || 'none detected'}`);
    }
  } else if (intent === 'modify') {
    parts.push(CONTEXT_MODIFY);
  } else {
    parts.push(CONTEXT_CREATE);
  }

  // Add relevant knowledge
  if (knowledge) {
    parts.push(`\nREFERENCE:\n${knowledge}`);
  }

  // Add current code if present
  if (currentCode?.trim()) {
    parts.push(`\nCURRENT CODE:\n${currentCode}`);
  }

  // Add the user request
  parts.push(`\nUSER REQUEST: ${request}`);
  parts.push('\nGenerate Strudel code now:');

  return parts.join('\n');
}

/**
 * Example templates for few-shot prompting
 */
export const EXAMPLES = {
  melodicTechno: `
// Melodic Techno - 122 BPM
setcps(122/60/4)

// Kick
$: s("bd*4")
   .bank("RolandTR909")
   .gain(0.85)
   .room(0.1)
   .analyze(1)

// Hats
$: s("~ hh ~ hh")
   .bank("RolandTR909")
   .hpf(8000)
   .gain(0.2)
   .analyze(1)

// Lead arp
$: note("<[0 3 5 7] [5 7 9 7]>")
   .scale("a:minor")
   .s("sine")
   .fm(3)
   .lpf(2500)
   .lpenv(4)
   .lpd(0.2)
   .delay(0.4)
   .delaytime(0.375)
   .room(0.35)
   .gain(0.4)
   ._pianoroll()

// Bass
$: note("0 ~ 0 ~")
   .scale("a:minor")
   .s("sine")
   .lpf(200)
   .gain(0.5)
   ._pianoroll()`,

  house: `
// House - 125 BPM
setcps(125/60/4)

// Kick
$: s("bd*4")
   .bank("RolandTR909")
   .gain(0.85)
   .analyze(1)

// Hats
$: s("~ hh ~ hh")
   .bank("RolandTR909")
   .hpf(7000)
   .gain(0.25)
   .analyze(1)

// Clap
$: s("~ cp ~ cp")
   .bank("RolandTR909")
   .room(0.25)
   .gain(0.6)
   .analyze(1)

// Chords
$: note("<[0,4,7] [2,5,9]>")
   .scale("c:minor")
   .s("square")
   .lpf(1600)
   .lpenv(3)
   .lpd(0.12)
   .decay(0.2)
   .sustain(0)
   .room(0.3)
   .gain(0.35)
   ._pianoroll()

// Bass
$: note("0 0 ~ 0")
   .scale("c:minor")
   .s("sawtooth")
   .lpf(220)
   .gain(0.5)
   ._pianoroll()`
};
