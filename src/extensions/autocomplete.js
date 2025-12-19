/**
 * AI Autocomplete Extension for CodeMirror
 * Provides Copilot-style ghost text suggestions for Strudel code
 */

import { ViewPlugin, Decoration, EditorView, WidgetType } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { Prec } from '@codemirror/state';

const CHUTES_API_KEY = import.meta.env.VITE_CHUTES_API_KEY;
const CHUTES_BASE_URL = import.meta.env.VITE_CHUTES_BASE_URL || 'https://llm.chutes.ai';
const MODEL = 'deepseek-ai/DeepSeek-V3.2-Speciale-TEE';

// Autocomplete system prompt - focused on code completion
const AUTOCOMPLETE_SYSTEM_PROMPT = `You are a Strudel/TidalCycles code completion assistant. Complete the code snippet provided.

Rules:
- Return ONLY the completion text, no explanations
- Complete the current line/pattern logically
- Keep completions short and relevant (1-3 lines max)
- Match the coding style and indentation
- For method chains (.lpf, .gain, etc.), suggest appropriate values
- For patterns, suggest musically sensible continuations

Common patterns:
- After 's("' or 'sound("' - suggest drum sounds: bd, sd, hh, cp, etc.
- After 'n("' or 'note("' - suggest numbers or mini-notation
- After '.' - suggest effects: .lpf(), .hpf(), .gain(), .delay(), .reverb(), .pan()
- After '$:' - suggest a new pattern line

Return only the code to insert, nothing else.`;

// Effects for managing state
const setSuggestion = StateEffect.define();
const clearSuggestion = StateEffect.define();

// Ghost text widget
class GhostTextWidget extends WidgetType {
  constructor(text) {
    super();
    this.text = text;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-ghost-text';
    span.textContent = this.text;
    return span;
  }

  eq(other) {
    return other.text === this.text;
  }
}

// State field to store current suggestion
const suggestionState = StateField.define({
  create() {
    return { text: '', pos: 0 };
  },
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setSuggestion)) {
        return e.value;
      }
      if (e.is(clearSuggestion)) {
        return { text: '', pos: 0 };
      }
    }
    // Clear on any document change
    if (tr.docChanged) {
      return { text: '', pos: 0 };
    }
    return value;
  }
});

// Decoration for ghost text
const suggestionDecoration = EditorView.decorations.compute([suggestionState], (state) => {
  const { text, pos } = state.field(suggestionState);
  if (!text || pos === 0) return Decoration.none;

  const widget = Decoration.widget({
    widget: new GhostTextWidget(text),
    side: 1
  });

  return Decoration.set([widget.range(pos)]);
});

// Debounce helper
function debounce(fn, ms) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

// Check if we should trigger autocomplete
function shouldTrigger(doc, pos) {
  const line = doc.lineAt(pos);
  const textBefore = line.text.slice(0, pos - line.from);

  // Trigger patterns
  const triggers = [
    /\.\s*$/,           // After a dot (method chaining)
    /\$:\s*$/,          // After $: (new pattern)
    /s\(\s*"$/,         // Inside s("")
    /n\(\s*"$/,         // Inside n("")
    /note\(\s*"$/,      // Inside note("")
    /sound\(\s*"$/,     // Inside sound("")
    /\(\s*$/,           // After opening paren
    /,\s*$/,            // After comma
    /\s{2,}$/           // Multiple spaces (might want continuation)
  ];

  return triggers.some(t => t.test(textBefore));
}

// Fetch completion from AI
async function fetchCompletion(code, cursorPos, signal) {
  if (!CHUTES_API_KEY) return null;

  const beforeCursor = code.slice(0, cursorPos);
  const afterCursor = code.slice(cursorPos);

  // Get context (last few lines before cursor)
  const lines = beforeCursor.split('\n');
  const contextLines = lines.slice(-10).join('\n');

  try {
    const response = await fetch(`${CHUTES_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHUTES_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: AUTOCOMPLETE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Complete this Strudel code at the cursor position [CURSOR]:

\`\`\`javascript
${contextLines}[CURSOR]${afterCursor.slice(0, 100)}
\`\`\`

Return ONLY the code to insert at [CURSOR], nothing else.`
          }
        ],
        stream: false,
        max_tokens: 150,
        temperature: 0.3
      }),
      signal
    });

    if (!response.ok) return null;

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    // DeepSeek V3.2 returns content in reasoning_content, not content
    let completion = message?.content || message?.reasoning_content || '';

    // Clean up the completion
    completion = completion
      .replace(/^```[\w]*\n?/, '')  // Remove opening code fence
      .replace(/\n?```$/, '')       // Remove closing code fence
      .replace(/^\[CURSOR\]/, '')   // Remove cursor marker if echoed
      .trim();

    // Take only first few lines if too long
    const completionLines = completion.split('\n');
    if (completionLines.length > 3) {
      completion = completionLines.slice(0, 3).join('\n');
    }

    return completion || null;
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Autocomplete error:', err);
    }
    return null;
  }
}

// Main autocomplete plugin
const autocompletePlugin = ViewPlugin.fromClass(class {
  constructor(view) {
    this.view = view;
    this.abortController = null;

    this.debouncedFetch = debounce(async (pos) => {
      // Cancel any pending request
      if (this.abortController) {
        this.abortController.abort();
      }

      const doc = this.view.state.doc;
      if (!shouldTrigger(doc, pos)) return;

      this.abortController = new AbortController();

      const completion = await fetchCompletion(
        doc.toString(),
        pos,
        this.abortController.signal
      );

      if (completion && this.view.state.selection.main.head === pos) {
        this.view.dispatch({
          effects: setSuggestion.of({ text: completion, pos })
        });
      }
    }, 800); // 800ms debounce
  }

  update(update) {
    if (update.docChanged || update.selectionSet) {
      // Clear current suggestion
      this.view.dispatch({
        effects: clearSuggestion.of()
      });

      // Only trigger on typing, not deletion
      if (update.docChanged) {
        const pos = this.view.state.selection.main.head;
        this.debouncedFetch(pos);
      }
    }
  }

  destroy() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
});

// Keymap for accepting/rejecting suggestions
const autocompleteKeymap = Prec.highest(EditorView.domEventHandlers({
  keydown(event, view) {
    const suggestion = view.state.field(suggestionState);

    if (suggestion.text) {
      if (event.key === 'Tab') {
        // Accept suggestion
        event.preventDefault();
        view.dispatch({
          changes: { from: suggestion.pos, insert: suggestion.text },
          effects: clearSuggestion.of()
        });
        return true;
      }

      if (event.key === 'Escape') {
        // Reject suggestion
        event.preventDefault();
        view.dispatch({
          effects: clearSuggestion.of()
        });
        return true;
      }
    }

    return false;
  }
}));

// Theme for ghost text
const autocompleteTheme = EditorView.theme({
  '.cm-ghost-text': {
    color: '#666',
    fontStyle: 'italic',
    opacity: '0.6'
  }
});

// Export the complete extension
export function aiAutocomplete() {
  if (!CHUTES_API_KEY) {
    // Return empty array if not configured
    return [];
  }

  return [
    suggestionState,
    suggestionDecoration,
    autocompletePlugin,
    autocompleteKeymap,
    autocompleteTheme
  ];
}

export default aiAutocomplete;
