// AI Service - Strudel Music Generation
// Modular architecture with intent classification and code formatting

import { getRelevantKnowledge } from "./knowledge";
import {
  buildPrompt,
  classifyIntent,
  detectGenre,
  parseExistingCode,
  EXAMPLES
} from "./prompts";

const CHUTES_API_KEY = import.meta.env.VITE_CHUTES_API_KEY;
const CHUTES_BASE_URL = import.meta.env.VITE_CHUTES_BASE_URL || 'https://llm.chutes.ai';
const MODEL = 'deepseek-ai/DeepSeek-V3.2';

/**
 * Validate that output looks like Strudel code
 */
function isValidStrudelOutput(text) {
  const hasStrudelSyntax = /\$:|setcps|\.s\(|note\(|\.bank\(/.test(text);
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasAxios = /axios|npm|import\s+{|require\(|module\.exports/.test(text);
  const hasTutorial = /前言|实现|方法|参数|对象/.test(text);

  return hasStrudelSyntax && !hasChinese && !hasAxios && !hasTutorial;
}

/**
 * Format Strudel code to multi-line format
 * This ensures all method chains are properly formatted
 */
function formatStrudelCode(code) {
  if (!code) return code;

  // Split into lines
  let lines = code.split('\n');
  let result = [];

  for (let line of lines) {
    // Skip empty lines, comments, and setcps
    if (!line.trim() || line.trim().startsWith('//') || line.trim().startsWith('setcps')) {
      result.push(line);
      continue;
    }

    // Check if this is a $: line with a long chain
    if (line.includes('$:') && line.includes(').') && line.length > 60) {
      // Format long chains
      const formatted = formatMethodChain(line);
      result.push(formatted);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Format a method chain into multi-line format
 * Handles nested parentheses like .lpf(sine.range(100,200).slow(4))
 */
function formatMethodChain(line) {
  // Extract leading whitespace
  const leadingSpace = line.match(/^(\s*)/)[1];

  // Find the base pattern ($: ... first function call)
  // Handle both simple and complex first arguments
  const baseMatch = line.match(/^(\s*\$:\s*(?:s|note|n|sound)\([^)]*\))/);
  if (!baseMatch) return line;

  const base = baseMatch[1];
  const rest = line.slice(base.length);

  // Parse method calls handling nested parentheses
  const methods = [];
  let i = 0;

  while (i < rest.length) {
    // Skip whitespace
    while (i < rest.length && /\s/.test(rest[i])) i++;

    // Look for .methodName(
    if (rest[i] === '.') {
      const methodStart = i;
      i++; // skip .

      // Get method name
      while (i < rest.length && /[a-zA-Z_0-9]/.test(rest[i])) i++;

      // Find opening paren
      if (rest[i] === '(') {
        let parenDepth = 1;
        i++; // skip (

        // Find matching closing paren
        while (i < rest.length && parenDepth > 0) {
          if (rest[i] === '(') parenDepth++;
          else if (rest[i] === ')') parenDepth--;
          i++;
        }

        methods.push(rest.slice(methodStart, i));
      }
    } else {
      i++;
    }
  }

  if (methods.length <= 2) return line; // Short chains are fine

  // Build multi-line output
  const indent = '   '; // 3-space indent for continuation
  let formatted = base;
  for (const method of methods) {
    formatted += '\n' + leadingSpace + indent + method;
  }

  return formatted;
}

/**
 * Post-process AI output to ensure quality
 */
function postProcessOutput(text, _intent, _currentCode) {
  if (!text) return text;

  let result = text;

  // Extract code from markdown blocks
  const codeMatch = result.match(/```(?:javascript|js)?\n?([\s\S]*?)```/);
  if (codeMatch) {
    const beforeCode = result.slice(0, result.indexOf('```')).trim();
    let code = codeMatch[1].trim();

    // Format the code
    code = formatStrudelCode(code);

    // Validate
    if (!isValidStrudelOutput(code)) {
      console.warn('[AI] Output validation failed, returning as-is');
    }

    // Rebuild with description if present
    if (beforeCode && beforeCode.length < 150 && !beforeCode.includes('axios')) {
      return `${beforeCode}\n\n\`\`\`javascript\n${code}\n\`\`\``;
    }
    return `\`\`\`javascript\n${code}\n\`\`\``;
  }

  // If no code block but has Strudel syntax, wrap it
  if (/\$:|setcps/.test(result) && !result.includes('```')) {
    const codeStart = result.search(/(\$:|setcps)/);
    if (codeStart > 0) {
      const desc = result.slice(0, codeStart).trim();
      let code = result.slice(codeStart).trim();
      code = formatStrudelCode(code);

      if (desc.length < 150) {
        return `${desc}\n\n\`\`\`javascript\n${code}\n\`\`\``;
      }
      return `\`\`\`javascript\n${code}\n\`\`\``;
    }
    result = formatStrudelCode(result);
    return `\`\`\`javascript\n${result}\n\`\`\``;
  }

  return result;
}

/**
 * Build example for few-shot prompting based on genre
 */
function getExample(genre) {
  if (genre === 'house') return EXAMPLES.house;
  return EXAMPLES.melodicTechno;
}

/**
 * Stream chat completions with the new pipeline
 */
export async function* streamChat(messages, currentCode = '', contextFiles = [], signal = null) {
  if (!CHUTES_API_KEY) throw new Error('VITE_CHUTES_API_KEY missing');

  // Extract user request
  const userRequest = messages[messages.length - 1]?.content || '';

  // Step 1: Classify intent
  const intent = classifyIntent(userRequest, currentCode);
  console.log('[AI] Intent:', intent);

  // Step 2: Detect genre
  const genre = detectGenre(userRequest);
  console.log('[AI] Genre:', genre);

  // Step 3: Get relevant knowledge
  const knowledge = getRelevantKnowledge(userRequest);

  // Step 4: Build context from files
  let fileContext = '';
  if (contextFiles?.length > 0) {
    fileContext = '\nREFERENCED FILES:\n';
    contextFiles.forEach(f => {
      fileContext += `[${f.name}]\n${f.code}\n`;
    });
  }

  // Step 5: Build the complete prompt
  const fullPrompt = buildPrompt(
    userRequest,
    currentCode,
    knowledge + fileContext,
    intent,
    genre
  );

  // Step 6: Add example for few-shot learning
  const example = getExample(genre);
  const promptWithExample = `${fullPrompt}\n\nEXAMPLE OUTPUT FORMAT:\n${example}`;

  // Prepare API payload
  const payload = {
    model: MODEL,
    messages: [
      { role: 'user', content: promptWithExample }
    ],
    stream: true,
    max_tokens: 2000,
    temperature: 0.15,  // Low for consistency
    top_p: 0.9
  };

  console.log('[AI] Request:', userRequest.substring(0, 50));

  const response = await fetch(`${CHUTES_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHUTES_API_KEY}`
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${err.substring(0, 100)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponse = '';
  let yieldedLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();

        if (data === '[DONE]') {
          // Stream complete - apply full post-processing
          const processed = postProcessOutput(fullResponse, intent, currentCode);
          if (processed.length > yieldedLength) {
            yield processed.slice(yieldedLength);
          }
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            // During streaming - minimal processing
            const cleaned = cleanDuringStream(fullResponse);
            if (cleaned.length > yieldedLength) {
              yield cleaned.slice(yieldedLength);
              yieldedLength = cleaned.length;
            }
          }
        } catch {}
      }
    }

    // Final flush
    if (fullResponse) {
      const processed = postProcessOutput(fullResponse, intent, currentCode);
      if (processed.length > yieldedLength) {
        yield processed.slice(yieldedLength);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Minimal cleaning during streaming (don't break partial output)
 */
function cleanDuringStream(text) {
  if (!text) return '';

  let result = text.trim();

  // Remove common prefixes
  result = result.replace(/^(ANSWER:|OUTPUT:|RESPONSE:|Here'?s?:?)[\s]*/i, '');

  // Remove stray $ or $: at the very beginning
  result = result.replace(/^\$:?\s*\n/, '');

  return result;
}

/**
 * Non-streaming chat
 */
export async function chat(messages, currentCode = '') {
  let result = '';
  for await (const chunk of streamChat(messages, currentCode)) {
    result += chunk;
  }
  return result;
}

/**
 * Extract code blocks from response
 */
export function extractCodeBlocks(text) {
  const blocks = [];
  const regex = /```(?:javascript|js)?\n?([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const code = match[1].trim();
    if (code) blocks.push(code);
  }
  return blocks;
}

/**
 * Smart merge for ADD intent - combines new code with existing
 */
export function mergeCode(existingCode, newCode, intent) {
  if (intent !== 'add' || !existingCode?.trim()) {
    return newCode;
  }

  // Parse existing code to understand structure
  const existing = parseExistingCode(existingCode);

  // Check if new code has setcps - remove it if existing already has tempo
  let mergedNew = newCode;
  if (existing?.tempo) {
    mergedNew = newCode.replace(/setcps\([^)]+\);?\s*\n?/, '');
  }

  // Combine: existing code + newline + new code
  return existingCode.trim() + '\n\n' + mergedNew.trim();
}

/**
 * Check if API is configured
 */
export function isConfigured() {
  return Boolean(CHUTES_API_KEY);
}
