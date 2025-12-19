// Strudel Knowledge Base - Comprehensive Reference
// Complete documentation for AI music generation

// ============================================================================
// CORE ARCHITECTURE
// ============================================================================

const CORE_ARCHITECTURE = `
STRUDEL ARCHITECTURE:

PATTERNS & CYCLES:
- Everything is a Pattern that repeats every cycle
- Cycle = one musical bar at current tempo
- Default = 1 cycle per second (60 BPM equivalent)
- Use setcps(BPM/60/4) to set tempo (BPM in quarter notes)

PATTERN DECLARATION:
- $: prefix required for each sound layer
- No closing parenthesis at end of chain
- Each layer runs independently in parallel

TEMPO FORMULA:
setcps(BPM/60/4)
- 120 BPM: setcps(120/60/4) = setcps(0.5)
- 122 BPM: setcps(122/60/4)
- 130 BPM: setcps(130/60/4)

BASIC STRUCTURE:
setcps(122/60/4)

$: s("bd*4").bank("RolandTR909").gain(0.85)

$: note("0 3 5 7").scale("a:minor").s("sine").gain(0.4)
`;

// ============================================================================
// MINI NOTATION - COMPLETE REFERENCE
// ============================================================================

const MINI_NOTATION = `
MINI-NOTATION COMPLETE REFERENCE:

BASIC OPERATORS:
| Operator | Syntax | Description | Example |
|----------|--------|-------------|---------|
| Space | a b c | Sequential, equal duration | "bd sd hh" |
| [] | [a b] | Subdivision, fit in one slot | "[bd sd] hh" |
| [,] | [a,b] | Polyphony, play together | "[bd,sd]" |
| * | a*n | Speed up/repeat n times | "hh*8" |
| / | a/n | Slow down by factor n | "pad/4" |
| <> | <a b> | Alternate per cycle | "<bd sd>" |
| ~ | ~ | Rest/silence | "bd ~ sd ~" |
| @ | a@n | Elongate (weight n) | "bd@3 sd" |
| ! | a!n | Replicate without speed | "bd!3" |
| ? | a? | 50% random removal | "hh?" |
| ?n | a?0.25 | n% random removal | "hh?0.25" |
| | | a|b | Random choice | "bd|sd" |
| () | (p,s) | Euclidean rhythm | "bd(3,8)" |
| () | (p,s,r) | Euclidean + rotation | "bd(3,8,1)" |
| : | a:n | Select variation | "hh:2" |

EUCLIDEAN RHYTHMS (p,s) or (p,s,r):
- (3,8) = x..x..x. = 3 hits spread over 8 steps
- (5,8) = x.xx.xx. = 5 hits spread over 8 steps
- (3,8,1) = .x..x..x = rotated by 1 step

ALTERNATION <> PATTERNS:
- "<a b>" = a on cycle 1, b on cycle 2, repeat
- "<a b c d>" = 4-cycle alternation
- "<[a b] [c d]>" = alternate between subdivisions

CHORD NOTATION:
- "[c3,e3,g3]" = C major chord
- "[0,4,7]" with scale = scale-degree chord
`;

// ============================================================================
// SAMPLES & SOUND BANKS
// ============================================================================

const SAMPLES_REFERENCE = `
SAMPLES & BANKS:

DRUM MACHINE BANKS (use .bank()):
| Bank | Character | Best For |
|------|-----------|----------|
| RolandTR909 | Punchy, crisp | House, techno |
| RolandTR808 | Deep, snappy | Hip-hop, electro |
| RolandTR707 | Digital, tight | Electro, new wave |
| RolandTR505 | Light, digital | Pop, synth |
| LinnDrum | Realistic | 80s pop, funk |
| OberheimDMX | Punchy, 80s | Electro, hip-hop |
| AkaiLinn | Warm, punchy | R&B, soul |

DRUM ABBREVIATIONS:
- bd: bass drum/kick
- sd: snare drum
- hh: hi-hat (closed)
- oh: open hi-hat
- cp: clap
- rim: rimshot
- lt/mt/ht: low/mid/high tom
- rd: ride cymbal
- cr: crash cymbal

SAMPLE VARIATIONS:
- hh:0, hh:1, hh:2 = different hi-hat sounds
- s("hh:<0 1 2 3>") = cycle through variations

SAMPLE MANIPULATION:
- begin(0-1): start position (0.5 = middle)
- end(0-1): end position (0.1 = first 10%)
- speed(n): playback rate (negative = reverse)
- loop(1): enable looping
- loopAt(n): fit sample to n cycles
- fit(): match sample to event duration
- cut(group): cut group (only one plays)
- chop(n): slice into n parts
- slice(n, "pattern"): chop then resequence

LOADING CUSTOM SAMPLES:
samples({ name: ['url1.wav', 'url2.wav'] })
samples('github:user/repo')
`;

// ============================================================================
// EFFECTS - COMPLETE REFERENCE
// ============================================================================

const EFFECTS_REFERENCE = `
EFFECTS COMPLETE REFERENCE:

FILTERS:
- lpf(freq): lowpass filter (100-20000 Hz)
- hpf(freq): highpass filter
- bpf(freq): bandpass filter
- lpq(q): lowpass resonance (0-50)
- hpq(q): highpass resonance
- vowel("a/e/i/o/u"): formant filter
- ftype("12db/24db/ladder"): filter type

FILTER ENVELOPES (ESSENTIAL for good sound):
- lpenv(depth): envelope amount (1-8 typical)
- lpa(seconds): filter attack (0.01-0.5)
- lpd(seconds): filter decay (0.1-0.5)
- lps(0-1): filter sustain level
- lpr(seconds): filter release

FILTER RECIPES:
- Plucky bass: .lpf(300).lpenv(4).lpd(0.2)
- Acid squelch: .lpf(400).lpq(15).lpenv(6).lpd(0.15)
- Attack sweep: .lpf(400).lpenv(4).lpa(0.15).lpd(0.2)
- Soft pad: .lpf(1200).lpa(0.3).lpd(0.5)

REVERB:
- room(0-1): reverb amount/send
- roomsize/size(1-10): space size
- roomfade(seconds): decay time
- roomlp(freq): reverb lowpass (darker reverb)

DELAY:
- delay(0-1): delay amount/send
- delaytime(seconds): delay time
- delayfeedback(0-1): feedback amount
- delayt(note): delay time in note values

DELAY TIME CALCULATIONS (at 120 BPM):
- 1/4 note: 0.5 seconds
- 1/8 note: 0.25 seconds
- Dotted 1/8: 0.375 seconds (signature melodic techno sound!)
- 1/16 note: 0.125 seconds

DISTORTION & SATURATION:
- distort(amount): waveshaping distortion
- crush(bits): bit crushing (4-8 = lo-fi)
- coarse(amount): sample rate reduction

MODULATION EFFECTS:
- phaser(speed): phaser rate (1-8)
- phaserdepth(0-1): phaser depth
- tremolo(depth): amplitude modulation
- vib(hz): vibrato speed
- vibmod(semitones): vibrato depth

DYNAMICS:
- compressor("threshold:ratio:attack:release")
- postgain(db): post-effects gain

STEREO:
- pan(0-1): stereo position (0.5 = center)
- jux(fn): apply function to right channel
- juxBy(width, fn): adjustable stereo spread
`;

// ============================================================================
// SYNTHESIZERS
// ============================================================================

const SYNTHS_REFERENCE = `
SYNTHESIZERS (use with .s()):

BASIC WAVEFORMS:
- sine: pure tone, no harmonics
- sawtooth: bright, rich harmonics, buzzy
- square: hollow, odd harmonics, woody
- triangle: soft, few harmonics

NOISE TYPES:
- white: all frequencies, harsh
- pink: balanced, natural
- brown: low frequency emphasis, soft

FM SYNTHESIS (KEY for melodic techno!):
- fm(index): modulation amount (1-8 typical)
- fmh(ratio): harmonic ratio
  * 1 = fundamental
  * 2 = octave
  * 0.5 = suboctave
  * Non-integers = metallic/bell sounds
- fmattack(s): FM envelope attack
- fmdecay(s): FM envelope decay
- fmsustain(0-1): FM sustain level

FM RECIPES:
- Plucky lead: .fm(3).fmh(2).fmdecay(0.2)
- Electric piano: .fm(1.5).fmh(4).fmdecay(0.5)
- Bell: .fm(6).fmh(3.5).fmdecay(1)
- Warm bass: .fm(0.5).fmh(1)

AMPLITUDE ENVELOPE:
- attack(seconds): rise time
- decay(seconds): fall to sustain
- sustain(0-1): sustain level
- release(seconds): fade out after note ends

PITCH ENVELOPE:
- penv(semitones): pitch envelope depth
- pattack(s): pitch attack
- pdecay(s): pitch decay

WAVETABLE:
- Over 1000 wavetables with wt_ prefix
- .s("wt_flute"), .s("wt_saw"), .s("wt_piano")

LAYERING:
- .s("sawtooth, square") = stack oscillators
- Add detune: .add(note("0,.1"))
`;

// ============================================================================
// SIGNALS & MODULATION
// ============================================================================

const SIGNALS_REFERENCE = `
SIGNALS (Continuous Patterns for Modulation):

SIGNAL TYPES:
- sine: smooth 0 to 1 to 0 oscillation
- cosine: sine shifted 90 degrees
- saw: ramp 0 to 1, then drop
- tri: triangle wave
- square: on/off pulse
- rand: random value per event
- perlin: smooth organic noise
- irand(max): random integer

SIGNAL METHODS:
- .range(min, max): scale output range
- .slow(n): divide speed by n
- .fast(n): multiply speed by n
- .segment(n): quantize to n steps

MODULATION EXAMPLES:
- Filter sweep: .lpf(sine.range(200, 2000).slow(4))
- Wobble bass: .lpf(sine.range(100, 800).fast(4))
- Organic movement: .lpf(perlin.range(400, 1200).slow(8))
- Tremolo: .gain(sine.range(0.3, 0.8).fast(2))
- Random pan: .pan(rand.range(0.3, 0.7))
- Tape warble: .add(note(perlin.range(0, 0.3)))

LFO SPEED REFERENCE:
- .slow(1) = 1 cycle (1 bar at default tempo)
- .slow(4) = 4 cycles (4 bars)
- .slow(8) = 8 cycles
- .fast(2) = twice per cycle
- .fast(4) = four times per cycle

CONTINUOUS MODULATION:
- Use .seg(16) for smooth continuous changes
- Without .seg(), values update per event only
`;

// ============================================================================
// PATTERN TRANSFORMS
// ============================================================================

const PATTERNS_REFERENCE = `
PATTERN TRANSFORMS:

TIME MANIPULATION:
- fast(n): speed up by n
- slow(n): slow down by n
- early(time): shift earlier
- late(time): shift later
- off(time, fn): offset copy + transform

PATTERN CREATION:
- stack(...): layer patterns simultaneously
- cat(...): concatenate (each = 1 cycle)
- seq(...): concatenate (all = 1 cycle)
- run(n): generate 0,1,2...n-1
- silence: empty pattern

TRANSFORMS:
- rev(): reverse pattern
- ply(n): repeat each event n times
- chunk(n, fn): subdivide + transform
- struct("pattern"): apply rhythm mask
- mask("pattern"): filter by pattern
- euclid(p, s): apply euclidean rhythm

PROBABILITY:
- rarely(fn): ~25% chance
- sometimes(fn): ~50% chance
- often(fn): ~75% chance
- someCycles(fn): 50% of cycles
- sometimesBy(0.3, fn): 30% chance

PERIODIC:
- every(n, fn): apply every n cycles
- whenmod(n, m, fn): when cycle mod n < m
- firstOf(n, fn): first of every n cycles

PATTERN TRICKS:
- .every(4, rev) = reverse every 4 cycles
- .sometimes(fast(2)) = random double time
- .off(0.5, x => x.add(note(7))) = add 5th harmony
`;

// ============================================================================
// SCALES & MUSIC THEORY
// ============================================================================

const SCALES_REFERENCE = `
SCALES & MUSIC THEORY:

SCALE SYNTAX:
.scale("root:mode")
- root: c, c#, db, d, d#, eb, e, f, f#, gb, g, g#, ab, a, a#, bb, b
- mode: major, minor, dorian, phrygian, lydian, mixolydian, etc.

COMMON SCALES FOR ELECTRONIC MUSIC:
- a:minor - melancholic, emotional (melodic techno)
- d:minor - dramatic, intense
- e:minor - open, guitar-friendly
- c:minor - dark, cinematic
- f:minor - moody, deep
- g:minor - baroque, classical feel

SCALE DEGREES:
- 0 = root (tonic)
- 1 = 2nd
- 2 = 3rd
- 3 = 4th
- 4 = 5th
- 5 = 6th
- 6 = 7th
- 7 = octave

CHORD CONSTRUCTION (scale degrees):
- Major triad: [0, 2, 4]
- Minor triad: [0, 2, 4] in minor scale
- 7th chord: [0, 2, 4, 6]
- Add9: [0, 2, 4, 8]
- Sus4: [0, 3, 4]

CHORD VOICINGS:
- Close: [0, 2, 4] - tight
- Open: [0, 4, 9] - spread
- Drop 2: [0, 4, 7, 11]
- With octave: [0, 4, 7, 12]

PROGRESSIONS (in scale degrees):
- i - VI - III - VII: "0 5 2 6" (Am-F-C-G)
- i - iv - v - i: "0 3 4 0"
- i - VII - VI - VII: "0 6 5 6"
- iv - i - v - i: "3 0 4 0"

NOTE NAMES:
- note("c3 e3 g3") = C major chord
- note("a2 c3 e3") = A minor chord
- Use octave numbers (c3, c4, c5)
`;

// ============================================================================
// MIDI REFERENCE
// ============================================================================

const MIDI_REFERENCE = `
MIDI INTEGRATION:

SETUP:
await initMIDI()  // Required before using MIDI

SENDING MIDI:
.midi("Device Name")  // Send to MIDI device
.midi()  // Send to first available device

CHANNEL CONTROL:
.midichan(1-16)  // MIDI channel

MIDI CC:
.ccn(number)  // CC number
.ccv(value)  // CC value (0-127)

CLOCK & SYNC:
- Strudel sends MIDI clock automatically
- External devices can sync to Strudel tempo

EXAMPLE:
$: note("0 3 5 7")
   .scale("a:minor")
   .midi("Arturia MiniLab")
   .midichan(1)
`;

// ============================================================================
// GENRE-SPECIFIC KNOWLEDGE
// ============================================================================

const GENRE_KNOWLEDGE = {
  melodicTechno: {
    tags: ["melodic", "melodic techno", "anyma", "artbat", "tale of us", "afterlife", "emotional", "progressive"],
    content: `
MELODIC TECHNO (Anyma, ARTBAT, Tale of Us):

TEMPO: 120-126 BPM (122 typical)

CHARACTER:
- Emotional, melancholic minor keys
- Hypnotic arpeggios with delay
- Lush filtered pads
- Driving but not aggressive drums
- Space and atmosphere essential

DRUMS:
- Kick: Clean 4/4, tight, minimal reverb
  s("bd*4").bank("RolandTR909").gain(0.85).room(0.1)
- Hats: Sparse, offbeat or subtle 8ths, HIGH PASSED
  s("~ hh ~ hh").bank("RolandTR909").hpf(8000).gain(0.2)
- Clap: On 2&4, with reverb tail
  s("~ cp ~ ~").bank("RolandTR909").room(0.3).gain(0.5)

ARPS (signature element):
- 4-8 note patterns with heavy delay
- Dotted 8th delay (0.375s at 120bpm) is THE sound
- FM synthesis for plucky character
- Example:
  note("0 3 5 7 5 3")
     .scale("a:minor")
     .s("sine")
     .fm(2)
     .lpf(2500)
     .delay(0.4)
     .delaytime(0.375)
     .delayfeedback(0.5)
     .room(0.4)
     .gain(0.35)

PADS:
- Slow attack, long release
- Heavy filtering with movement
- Quiet in mix
  note("[0,4,7]/4")
     .scale("a:minor")
     .s("sawtooth")
     .lpf(sine.range(400,1000).slow(8))
     .attack(1)
     .release(2)
     .room(0.6)
     .gain(0.2)

BASS:
- Simple, supportive
- Filtered saw or sine
- Follow chord roots
  note("0 ~ 0 ~")
     .scale("a:minor")
     .s("sawtooth")
     .lpf(200)
     .gain(0.5)

KEYS: a:minor, d:minor, e:minor, f:minor
`
  },

  house: {
    tags: ["house", "disco", "funky", "four-on-floor", "garage", "deep"],
    content: `
HOUSE MUSIC:

TEMPO: 120-130 BPM (125 typical)

CHARACTER:
- Four-on-floor kick
- Offbeat hats
- Groovy bass lines
- Chord stabs
- Uplifting, danceable

DRUMS:
- Kick: bd*4, punchy, slight room
- Hats: Offbeat "~ hh ~ hh" or syncopated
- Clap: Beats 2 and 4
- Use RolandTR909 or RolandTR808

BASS:
- Rhythmic, follows kick
- Often octave patterns
  note("0 0 12 0")
     .scale("c:minor")
     .s("sawtooth")
     .lpf(250)
     .gain(0.5)

CHORDS:
- Stabs with quick decay
- Minor chords common
  note("<[0,4,7] [2,5,9] [0,4,7] [3,7,10]>")
     .scale("c:minor")
     .s("square")
     .lpf(1600)
     .lpenv(3)
     .lpd(0.1)
     .attack(0.01)
     .decay(0.2)
     .sustain(0)
     .gain(0.35)
`
  },

  techno: {
    tags: ["techno", "industrial", "dark", "hard", "driving", "minimal"],
    content: `
TECHNO (Industrial/Dark):

TEMPO: 130-145 BPM

CHARACTER:
- Driving, relentless
- Dark, aggressive
- Heavy use of filters
- Minimal melodic content
- Emphasis on rhythm and texture

DRUMS:
- Kick: Driving, can layer with LPF rumble
- Hats: 16th notes with velocity variation
- Use euclidean rhythms: (3,8), (5,16)

BASS:
- Dark, filtered
- Can be atonal/noise-based
- Heavy processing

TEXTURES:
- Noise sweeps
- Distorted percussion
- Industrial sounds
`
  },

  dnb: {
    tags: ["dnb", "drum and bass", "jungle", "breakbeat", "amen", "liquid"],
    content: `
DRUM & BASS / JUNGLE:

TEMPO: 160-180 BPM

CHARACTER:
- Breakbeat-based
- Fast, energetic
- Complex drum patterns
- Deep bass

DRUMS:
- Chopped breaks: s("break").chop(16)
- Reinforce kick
- Complex hi-hat patterns

BASS:
- Reese bass (detuned saws)
- Sub bass reinforcement
- Often follows break rhythm
`
  },

  ambient: {
    tags: ["ambient", "chill", "atmospheric", "drone", "texture", "relax"],
    content: `
AMBIENT:

TEMPO: Very slow (setcps(0.2) to setcps(0.5))

CHARACTER:
- Long, evolving textures
- Emphasis on space
- Minimal rhythm
- Heavy reverb and delay

TECHNIQUES:
- Long envelopes: attack(2), release(4)
- Slow filter modulation
- Layered pads
- Lydian/major scales for brightness
`
  }
};

// ============================================================================
// RETRIEVAL FUNCTION
// ============================================================================

/**
 * Get relevant knowledge based on user query
 * @param {string} query - User's request
 * @param {Object} options - Optional parameters
 * @returns {string} Relevant knowledge sections
 */
export function getRelevantKnowledge(query, options = {}) {
  const lowerQuery = query.toLowerCase();
  const sections = [];

  // Always include core syntax (abbreviated)
  sections.push(CORE_ARCHITECTURE);
  sections.push(MINI_NOTATION);

  // Detect genre and include specific knowledge
  let genreDetected = null;
  for (const [genre, data] of Object.entries(GENRE_KNOWLEDGE)) {
    if (data.tags.some(tag => lowerQuery.includes(tag))) {
      genreDetected = genre;
      sections.push(`=== ${genre.toUpperCase()} STYLE ===`);
      sections.push(data.content);
      break;
    }
  }

  // Default to melodic techno if no genre detected
  if (!genreDetected && !options.skipGenreDefault) {
    sections.push("=== MELODIC TECHNO STYLE (default) ===");
    sections.push(GENRE_KNOWLEDGE.melodicTechno.content);
  }

  // Add specific references based on query content
  if (/filter|lpf|hpf|cutoff|resonance|envelope/i.test(lowerQuery)) {
    sections.push("=== FILTERS ===");
    sections.push(EFFECTS_REFERENCE.split('REVERB:')[0]);
  }

  if (/reverb|delay|room|space|effect/i.test(lowerQuery)) {
    sections.push("=== EFFECTS ===");
    sections.push(EFFECTS_REFERENCE);
  }

  if (/synth|fm|oscillator|waveform|sine|saw/i.test(lowerQuery)) {
    sections.push("=== SYNTHESIZERS ===");
    sections.push(SYNTHS_REFERENCE);
  }

  if (/scale|chord|note|key|progression|harmony/i.test(lowerQuery)) {
    sections.push("=== SCALES & THEORY ===");
    sections.push(SCALES_REFERENCE);
  }

  if (/modulate|lfo|automate|signal|sweep/i.test(lowerQuery)) {
    sections.push("=== SIGNALS ===");
    sections.push(SIGNALS_REFERENCE);
  }

  if (/sample|bank|drum|909|808|chop|slice/i.test(lowerQuery)) {
    sections.push("=== SAMPLES ===");
    sections.push(SAMPLES_REFERENCE);
  }

  if (/pattern|transform|fast|slow|every|random/i.test(lowerQuery)) {
    sections.push("=== PATTERNS ===");
    sections.push(PATTERNS_REFERENCE);
  }

  if (/midi/i.test(lowerQuery)) {
    sections.push("=== MIDI ===");
    sections.push(MIDI_REFERENCE);
  }

  return sections.join("\n");
}

// Export individual sections for direct access
export {
  CORE_ARCHITECTURE,
  MINI_NOTATION,
  SAMPLES_REFERENCE,
  EFFECTS_REFERENCE,
  SYNTHS_REFERENCE,
  SIGNALS_REFERENCE,
  PATTERNS_REFERENCE,
  SCALES_REFERENCE,
  MIDI_REFERENCE,
  GENRE_KNOWLEDGE
};
