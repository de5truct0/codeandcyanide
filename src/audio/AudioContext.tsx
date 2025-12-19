import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getStrudelEngine, type StrudelEngine } from './strudelEngine';
import { type LintResult } from '../strudel/lint';

interface AudioContextValue {
  engine: StrudelEngine;
  audioContext: AudioContext | null;
  isInitialized: boolean;
  isPlaying: boolean;
  initialize: () => Promise<void>;
  play: (code: string) => Promise<{ success: boolean; error?: string }>;
  stop: () => void;
  toggle: (code?: string) => Promise<boolean>;
  validateCode: (code: string) => Promise<LintResult>;
  setRepl: (repl: any) => void;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const [engine] = useState(() => getStrudelEngine());
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Set up event listeners
    engine.setEvents({
      onPlay: () => setIsPlaying(true),
      onStop: () => setIsPlaying(false),
    });

    return () => {
      // Cleanup on unmount - but don't dispose the singleton
      // as other components might still use it
    };
  }, [engine]);

  const initialize = useCallback(async () => {
    if (isInitialized) return;

    const ctx = await engine.initialize();
    setAudioContext(ctx);
    setIsInitialized(true);
  }, [engine, isInitialized]);

  const play = useCallback(async (code: string) => {
    if (!isInitialized) {
      await initialize();
    }
    return engine.play(code);
  }, [engine, isInitialized, initialize]);

  const stop = useCallback(() => {
    engine.stop();
  }, [engine]);

  const toggle = useCallback(async (code?: string) => {
    if (!isInitialized) {
      await initialize();
    }
    return engine.toggle(code);
  }, [engine, isInitialized, initialize]);

  const validateCode = useCallback(async (code: string) => {
    return engine.validateCode(code);
  }, [engine]);

  const setRepl = useCallback((repl: any) => {
    engine.setRepl(repl);
  }, [engine]);

  const value: AudioContextValue = {
    engine,
    audioContext,
    isInitialized,
    isPlaying,
    initialize,
    play,
    stop,
    toggle,
    validateCode,
    setRepl,
  };

  return (
    <AudioCtx.Provider value={value}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio(): AudioContextValue {
  const context = useContext(AudioCtx);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

export { AudioCtx };
