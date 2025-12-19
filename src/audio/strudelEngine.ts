import { lint, type LintResult } from '../strudel/lint';

export interface StrudelEngineEvents {
  onPlay?: () => void;
  onStop?: () => void;
  onError?: (error: string) => void;
  onLintError?: (result: LintResult) => void;
}

class StrudelEngineImpl {
  private static instance: StrudelEngineImpl | null = null;

  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private playing = false;
  private currentRepl: any = null;
  private events: StrudelEngineEvents = {};

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): StrudelEngineImpl {
    if (!StrudelEngineImpl.instance) {
      StrudelEngineImpl.instance = new StrudelEngineImpl();
    }
    return StrudelEngineImpl.instance;
  }

  setEvents(events: StrudelEngineEvents): void {
    this.events = { ...this.events, ...events };
  }

  async initialize(): Promise<AudioContext> {
    if (this.isInitialized && this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return this.audioContext;
    }

    // Dynamic import to avoid SSR issues
    const { initAudio, getAudioContext } = await import('@strudel/webaudio');

    await initAudio();
    this.audioContext = getAudioContext();

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isInitialized = true;
    return this.audioContext;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  async validateCode(code: string): Promise<LintResult> {
    return lint(code);
  }

  setRepl(repl: any): void {
    this.currentRepl = repl;
  }

  async play(code: string, repl?: any): Promise<{ success: boolean; error?: string }> {
    // Validate code first
    const lintResult = lint(code);

    if (!lintResult.ok) {
      const errorMessages = lintResult.errors
        .filter(e => e.severity === 'error')
        .map(e => `Line ${e.line}: ${e.message}`)
        .join('\n');

      this.events.onLintError?.(lintResult);
      this.events.onError?.(`Code validation failed:\n${errorMessages}`);
      return { success: false, error: errorMessages };
    }

    // Stop any current playback first
    this.stop();

    // Ensure audio is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Use provided repl or stored one
    const replToUse = repl || this.currentRepl;

    if (!replToUse) {
      const error = 'No REPL instance available. Initialize the editor first.';
      this.events.onError?.(error);
      return { success: false, error };
    }

    try {
      await replToUse.evaluate();
      this.playing = true;
      this.events.onPlay?.();
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.events.onError?.(error);
      return { success: false, error };
    }
  }

  stop(): void {
    if (this.currentRepl) {
      try {
        this.currentRepl.stop();
      } catch {
        // Ignore stop errors
      }
    }

    // Also try global hush
    if (typeof window !== 'undefined' && (window as any).hush) {
      try {
        (window as any).hush();
      } catch {
        // Ignore
      }
    }

    this.playing = false;
    this.events.onStop?.();
  }

  async toggle(code?: string): Promise<boolean> {
    if (this.playing) {
      this.stop();
      return false;
    } else if (code) {
      const result = await this.play(code);
      return result.success;
    }
    return false;
  }

  dispose(): void {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.isInitialized = false;
    this.currentRepl = null;
    StrudelEngineImpl.instance = null;
  }
}

// Export singleton instance getter
export const getStrudelEngine = (): StrudelEngineImpl => {
  return StrudelEngineImpl.getInstance();
};

// Export type for consumers
export type StrudelEngine = StrudelEngineImpl;
