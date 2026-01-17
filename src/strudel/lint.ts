export interface LintError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface LintResult {
  ok: boolean;
  errors: LintError[];
}

// Forbidden synth waveforms used with s()
const FORBIDDEN_SAMPLE_SYNTHS = [
  'saw', 'sawtooth', 'square', 'sine', 'triangle', 'pulse', 'noise'
];

// Allowed parameter ranges
const PARAM_RANGES: Record<string, { min: number; max: number }> = {
  distort: { min: 0, max: 0.15 },
  distortion: { min: 0, max: 0.15 },
  resonance: { min: 0.2, max: 0.8 },
  room: { min: 0, max: 0.7 },
  lpf: { min: 200, max: 3000 },
};

// Potentially dangerous patterns
const DANGEROUS_PATTERNS = [
  /import\s+/,
  /require\s*\(/,
  /eval\s*\(/,
  /Function\s*\(/,
  /window\./,
  /document\./,
  /fetch\s*\(/,
  /XMLHttpRequest/,
];

function countOccurrences(str: string, char: string): number {
  let count = 0;
  for (const c of str) {
    if (c === char) count++;
  }
  return count;
}

export function lint(code: string): LintResult {
  const errors: LintError[] = [];
  const lines = code.split('\n');

  // Check each line
  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('//') || trimmed === '') {
      return;
    }

    // Check 1: s() with forbidden synth waveforms
    // Only match standalone s() calls, not .s() method chains
    // Valid: n("0").s("square") - using .s() as a method
    // Invalid: s("square") - using s() function with a synth name
    const sMatch = line.match(/(?<![.\w])s\s*\(\s*["']([^"']+)["']\s*\)/);
    if (sMatch) {
      const sample = sMatch[1].toLowerCase();
      for (const forbidden of FORBIDDEN_SAMPLE_SYNTHS) {
        if (sample === forbidden || sample.startsWith(`${forbidden}/`)) {
          errors.push({
            line: lineNum,
            column: line.indexOf(sMatch[0]) + 1,
            message: `s("${sMatch[1]}") is invalid. "${forbidden}" is a synth waveform, not a sample. Use n() or note() with .s("${forbidden}") for synths.`,
            severity: 'error',
          });
        }
      }
    }

    // Check 2: Dangerous patterns (JS imports, eval, etc.)
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(line)) {
        errors.push({
          line: lineNum,
          column: 1,
          message: `Potentially unsafe code detected. JavaScript imports and browser APIs are not allowed.`,
          severity: 'error',
        });
        break;
      }
    }

    // Check 3: Parameter range warnings
    for (const [param, range] of Object.entries(PARAM_RANGES)) {
      const paramRegex = new RegExp(`\\.${param}\\s*\\(\\s*([\\d.]+)\\s*\\)`);
      const match = line.match(paramRegex);
      if (match) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          if (value < range.min) {
            errors.push({
              line: lineNum,
              column: line.indexOf(match[0]) + 1,
              message: `.${param}(${value}) is below recommended minimum of ${range.min}`,
              severity: 'warning',
            });
          } else if (value > range.max) {
            errors.push({
              line: lineNum,
              column: line.indexOf(match[0]) + 1,
              message: `.${param}(${value}) exceeds recommended maximum of ${range.max}`,
              severity: 'warning',
            });
          }
        }
      }
    }

    // Check 4: .play() method in user code (should be handled by engine)
    if (/\.play\s*\(/.test(line) && !line.includes('isPlaying')) {
      errors.push({
        line: lineNum,
        column: line.indexOf('.play') + 1,
        message: `.play() should not be called directly. Use the Execute button instead.`,
        severity: 'error',
      });
    }
  });

  // Check 5: Unbalanced quotes
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let inBacktick = false;
  let quoteStartLine = 0;

  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';

      // Skip escaped quotes
      if (prevChar === '\\') continue;

      if (char === '"' && !inSingleQuote && !inBacktick) {
        if (!inDoubleQuote) quoteStartLine = lineNum;
        inDoubleQuote = !inDoubleQuote;
      } else if (char === "'" && !inDoubleQuote && !inBacktick) {
        if (!inSingleQuote) quoteStartLine = lineNum;
        inSingleQuote = !inSingleQuote;
      } else if (char === '`' && !inDoubleQuote && !inSingleQuote) {
        if (!inBacktick) quoteStartLine = lineNum;
        inBacktick = !inBacktick;
      }
    }
  });

  if (inDoubleQuote || inSingleQuote || inBacktick) {
    errors.push({
      line: quoteStartLine,
      column: 1,
      message: `Unclosed quote starting on line ${quoteStartLine}`,
      severity: 'error',
    });
  }

  // Check 6: Unbalanced parentheses
  let parenCount = 0;
  let bracketCount = 0;
  let braceCount = 0;

  const fullCode = code.replace(/\/\/[^\n]*/g, ''); // Remove single-line comments

  for (const char of fullCode) {
    if (char === '(') parenCount++;
    else if (char === ')') parenCount--;
    else if (char === '[') bracketCount++;
    else if (char === ']') bracketCount--;
    else if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
  }

  if (parenCount !== 0) {
    errors.push({
      line: 1,
      column: 1,
      message: `Unbalanced parentheses: ${parenCount > 0 ? 'missing ' + parenCount + ' closing' : 'extra ' + Math.abs(parenCount) + ' closing'} ")"`,
      severity: 'error',
    });
  }

  if (bracketCount !== 0) {
    errors.push({
      line: 1,
      column: 1,
      message: `Unbalanced brackets: ${bracketCount > 0 ? 'missing ' + bracketCount + ' closing' : 'extra ' + Math.abs(bracketCount) + ' closing'} "]"`,
      severity: 'error',
    });
  }

  if (braceCount !== 0) {
    errors.push({
      line: 1,
      column: 1,
      message: `Unbalanced braces: ${braceCount > 0 ? 'missing ' + braceCount + ' closing' : 'extra ' + Math.abs(braceCount) + ' closing'} "}"`,
      severity: 'error',
    });
  }

  // Check 7: Multiple different .scale() calls (warning only)
  const scaleMatches = code.match(/\.scale\s*\(\s*["']([^"']+)["']\s*\)/g);
  if (scaleMatches && scaleMatches.length > 1) {
    const scales = new Set(scaleMatches.map(m => {
      const match = m.match(/["']([^"']+)["']/);
      return match ? match[1] : '';
    }));
    if (scales.size > 1) {
      errors.push({
        line: 1,
        column: 1,
        message: `Multiple different scales detected: ${Array.from(scales).join(', ')}. Consider using a single scale for harmonic consistency.`,
        severity: 'warning',
      });
    }
  }

  return {
    ok: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  };
}

export function formatLintErrors(result: LintResult): string {
  if (result.ok && result.errors.length === 0) {
    return 'No issues found.';
  }

  return result.errors
    .map(err => `[${err.severity.toUpperCase()}] Line ${err.line}: ${err.message}`)
    .join('\n');
}
