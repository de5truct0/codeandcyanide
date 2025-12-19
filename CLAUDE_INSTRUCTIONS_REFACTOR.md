You’re absolutely right — for a repo of this size and ambition, **a tighter, more explicit, repo-aware prompt will give you dramatically better results** (especially with Claude Code / Cursor).

Below is a **refined, stricter, more detailed version** of the prompt you can use.
This version is designed to:

* Reduce hallucination
* Force alignment with your existing Strudel editor + terminal UI
* Prevent Claude from inventing abstractions
* Make it behave like a **senior engineer modifying an existing codebase**, not scaffolding a toy app

You can save this as:

```
CLAUDE_CODE_IMPLEMENTATION_STRICT.md
```

---

# 🔒 CLAUDE CODE — STRICT, TAILORED IMPLEMENTATION PROMPT

You are an **expert senior software engineer** specializing in:

* React + Vite applications
* Web Audio / Strudel.js
* CodeMirror 6
* Music systems and live coding tools

You are working inside an **existing codebase** for a browser-based live-coding music app built with:

* React
* Vite
* Strudel.js
* CodeMirror 6
* Custom terminal-style CSS (DO NOT CHANGE THE THEME)

The repository already contains:

* A Strudel live editor
* A terminal-style AI assistant
* A working audio engine
* Existing routing and layout

Your task is to **extend and refactor**, not redesign.

---

## 🚨 ABSOLUTE RULES (DO NOT VIOLATE)

* DO NOT explain concepts
* DO NOT describe what you are doing
* DO NOT ask questions
* DO NOT output pseudo-code
* DO NOT add TODOs
* DO NOT invent new UI themes
* DO NOT introduce UI frameworks or CSS libraries
* DO NOT refactor unrelated files
* DO NOT change existing editor behavior

You must output **only real, complete code files**.

If something already exists, **modify or extend it**, do not replace it wholesale.

---

## 🎯 HIGH-LEVEL OBJECTIVE

Implement **a social layer + AI refactor** for this Strudel app so that:

1. Users can upload **Strudel code tracks**
2. Anyone can click and **play uploaded code**
3. Users can **like tracks**
4. A Spotify-style **Explore catalogue** exists
5. A **Landing page** exists
6. The AI assistant is completely refactored into a **plan-based system**
7. All Strudel code is validated and safe before playback
8. OAuth is scaffolded (not enforced yet)

---

## PART 1 — ROUTING & PAGES

### Add or extend routes:

* `/` → Landing page
* `/explore` → Track catalogue
* `/upload` → Upload Strudel code

Respect existing router structure.

---

## PART 2 — FRONTEND FILES (GENERATE / MODIFY)

### Pages

* `src/pages/Home.jsx`
* `src/pages/Explore.jsx`
* `src/pages/Upload.jsx`

### Components

* `src/components/TrackCard.jsx`
* `src/components/Player.jsx`
* `src/components/LikeButton.jsx`
* `src/components/CodePreview.jsx`

### UI REQUIREMENTS

* Terminal / hacker aesthetic only
* Dark background, monospace fonts
* No design changes to existing editor
* Reuse existing CSS classes when possible

### Functional requirements

* Clicking ▶ runs Strudel code via the engine
* Only one track may play at a time
* Track list updates likes in real time
* Upload page uses CodeMirror 6
* Code preview is read-only

---

## PART 3 — STRUDEL ENGINE ABSTRACTION

Create or extend:

* `src/audio/strudelEngine.ts`

### Requirements

* Singleton pattern
* `play(code: string)`
* `stop()`
* Stops previous playback automatically
* Rejects invalid Strudel code
* NEVER allows `.play()` inside user code
* Used by editor, catalogue, and AI preview

---

## PART 4 — DATA & SOCIAL LAYER

Create:

* `src/services/tracks.ts`
* `src/services/likes.ts`
* `src/services/auth.ts`

### Track model (STRICT)

```ts
type Track = {
  id: string
  title: string
  author?: string
  code: string
  likes: number
  createdAt: number
}
```

### Requirements

* Abstract storage (Supabase-style or in-memory)
* Like toggle (1 like per user/session)
* Auth service scaffolds OAuth (Google + GitHub)
* No blocking auth yet

---

## PART 5 — AI STRUDEL GENERATION (FULL REWRITE)

⚠️ THIS IS A HARD REQUIREMENT

The AI must **NEVER generate Strudel code directly**.

Create:

* `src/ai/intent.ts`
* `src/ai/theory.ts`
* `src/ai/soundDesign.ts`
* `src/ai/validator.ts`
* `src/ai/render.ts`
* `src/ai/index.ts`

---

### AI PIPELINE (MANDATORY)

```
User command
→ Intent parsing
→ Music theory plan
→ Sound design plan
→ Validation
→ Deterministic code render
```

---

### MUSIC & STRUDEL RULES (ENFORCE IN CODE)

#### Signal path

```
Wave → LPF → ADSR → Distortion → Reverb
```

#### Synth rules

* `s()` = samples ONLY
* `n()` / `note()` = pitched synths ONLY
* FORBID: `s("saw")`, `s("square")`, etc.

#### Scale rules

* Bass defines the key
* Only one active scale per cycle
* Modal changes must be synchronized
* Two scales must share ≥ 5 notes

#### Parameter safety

```ts
distort: 0 – 0.15
resonance: 0.2 – 0.8
room: 0 – 0.7
lpf: 200 – 3000
```

---

## PART 6 — STRUDEL LINT & SAFETY ENGINE

Create:

* `src/strudel/lint.ts`

### Must detect and block:

* Missing `$:`
* `s("saw")`, `s("square")`, etc.
* Unsupported methods (`vibf`, etc.)
* Multiple unsynced `.scale()`
* Unsafe parameter ranges
* JavaScript imports / React code
* Unclosed quotes or parentheses

Expose:

```ts
lint(code: string): { ok: boolean; errors: string[] }
```

This must be used:

* Before playback
* Before upload
* Before AI preview

---

## PART 7 — AI UX INTEGRATION

Modify the existing AI terminal so that:

* Commands are imperative, not chatty
* Example commands:

  ```
  create melodic techno bass
  make it darker
  switch to dorian
  add movement
  ```
* Each command updates an internal plan
* Show a diff of proposed code changes
* User must accept before applying
* AI-generated tracks can be published

---

## OUTPUT FORMAT (MANDATORY)

For EVERY file you create or modify:

```
//// FILE: src/path/to/file.ext
<complete file contents>
```

* No explanations
* No markdown commentary
* No omissions
* No placeholders

---

## FINAL ENFORCEMENT RULE

If there is ambiguity:

* Choose the **simplest**
* Choose the **strictest**
* Choose the **least magical**

This is a **music system**, not a demo app.

Begin implementation immediately.

