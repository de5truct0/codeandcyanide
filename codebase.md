Project Path: src

Source Tree:

```txt
src
├── App.css
├── App.jsx
├── assets
│   └── react.svg
├── components
│   ├── ChatMessage.jsx
│   ├── ChatSidebar.jsx
│   ├── ChatTerminal.jsx
│   └── ThemeSwitcher.jsx
├── extensions
│   └── autocomplete.js
├── index.css
├── main.jsx
└── services
    ├── ai.js
    ├── knowledge.js
    └── prompts.js

```

`App.css`:

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

```

`App.jsx`:

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { StrudelMirror } from '@strudel/codemirror';
import { getDrawContext } from '@strudel/draw';
import { initAudio, getAudioContext, webaudioOutput } from '@strudel/webaudio';
import { transpiler } from '@strudel/transpiler';
import { prebake } from '@strudel/repl/prebake.mjs';
import { analysers, getAnalyzerData } from 'superdough';
import ChatTerminal from './components/ChatTerminal';
import ThemeSwitcher from './components/ThemeSwitcher';
import { aiAutocomplete } from './extensions/autocomplete';

// Theme configuration
const THEMES = {
  acid: { hueStart: 140, hueEnd: 180, glowColor: '#00ff9d', saturation: 100 },
  orphic: { hueStart: 270, hueEnd: 300, glowColor: '#a855f7', saturation: 100 },
  retard: { hueStart: 0, hueEnd: 0, glowColor: '#000000', saturation: 0, lightMode: true },
  'basic-bitch': { hueStart: 0, hueEnd: 0, glowColor: '#ffffff', saturation: 0 }
};

// --- INITIAL CODE ---
const defaultCode = `// STRUDEL KERNEL v2.0
// MODE: LIVE PERFORMANCE

setcps(0.65);

// 1. Kick Drum
$: s("bd*4")
   .bank("RolandTR909")
   .gain(0.9)
   .analyze(1)

// 2. Offbeat Hi-hats
$: s("~ hh")
   .bank("RolandTR909")
   .gain(0.4)
   .analyze(1)

// 3. Acid Bassline
$: n("0 0 . 7 0 3 0 . 10 0")
   .scale("g2:minor")
   .s("sawtooth")
   .lpf(slider(800, 100, 3000)) // <--- Drag me!
   .resonance(15)
   .decay(0.2)
   .sustain(0)
   .analyze(1)
`;

// --- WAVEFORM VISUALIZER WITH MULTIPLE MODES ---
function AudioVisualizer({ audioContext, isPlaying, waveformType, theme }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const historyRef = useRef([]);
  const rotationRef = useRef(0);
  const NUM_LAYERS = 48;
  const ROTATION_SPEED = 0.01;
  const themeConfig = THEMES[theme] || THEMES.acid;

  useEffect(() => {
    if (!audioContext) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const render = () => {
      if (!canvas) return;

      const width = canvas.parentElement.offsetWidth;
      const height = canvas.parentElement.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Background - theme aware
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width * 0.7
      );
      if (themeConfig.lightMode) {
        gradient.addColorStop(0, '#f0f0f0');
        gradient.addColorStop(1, '#e0e0e0');
      } else {
        gradient.addColorStop(0, '#0a0a0a');
        gradient.addColorStop(1, '#000000');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.35;

      rotationRef.current += ROTATION_SPEED;

      const analyser = analysers[1];

      if (analyser) {
        const timeData = getAnalyzerData('time', 1);
        const currentWave = Array.from(timeData).slice(0, 128);
        historyRef.current.unshift(currentWave);
        if (historyRef.current.length > NUM_LAYERS) {
          historyRef.current.pop();
        }

        for (let layer = historyRef.current.length - 1; layer >= 0; layer--) {
          const waveData = historyRef.current[layer];
          const depth = layer / NUM_LAYERS;

          // Theme-aware colors
          const hue = themeConfig.hueStart + depth * (themeConfig.hueEnd - themeConfig.hueStart);
          const saturation = themeConfig.saturation;
          const alpha = (1 - depth * 0.8) * 0.9 + 0.1;
          let lightness;
          if (themeConfig.lightMode) {
            lightness = 10 + depth * 40; // dark to mid-gray for light mode
          } else if (saturation === 0) {
            lightness = 90 - depth * 50; // white to gray for dark mode
          } else {
            lightness = 55 - depth * 30; // colored themes
          }

          ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
          ctx.lineWidth = (1 - depth) * 3 + 0.5;

          if (layer < 4) {
            ctx.shadowBlur = (4 - layer) * 10;
            ctx.shadowColor = themeConfig.glowColor;
          } else {
            ctx.shadowBlur = 0;
          }

          const points = waveData.length;
          const shrinkFactor = 1 - depth * 0.85;

          let sum = 0;
          for (let j = 0; j < points; j++) {
            sum += Math.abs(waveData[j] || 0);
          }
          const avgAmplitude = sum / points;
          const amplitudeMod = 1 + avgAmplitude * 0.8;

          ctx.beginPath();

          if (waveformType === 'line') {
            // --- LINEAR WAVEFORM ---
            const layerOffset = depth * height * 0.3;
            const yBase = centerY - layerOffset * 0.3;
            const waveWidth = width * 0.85 * (1 - depth * 0.5);
            const xStart = centerX - waveWidth / 2;
            const sliceWidth = waveWidth / points;

            for (let i = 0; i < points; i++) {
              const v = waveData[i] || 0;
              const amplitude = v * 80 * (1 - depth * 0.5);
              const x = xStart + i * sliceWidth;
              const y = yBase - amplitude;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          } else if (waveformType === 'circle') {
            // --- CIRCULAR WAVEFORM ---
            const layerRotation = rotationRef.current + depth * 1.5;

            for (let i = 0; i <= points; i++) {
              const angle = (i / points) * Math.PI * 2 + layerRotation;
              const v = waveData[i % points] || 0;
              const radiusMod = 1 + v * 0.4;
              const radius = baseRadius * radiusMod * shrinkFactor;
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          } else {
            // --- TRIANGLE WAVEFORM (default) ---
            const layerRotation = rotationRef.current + depth * 1.5;
            const NUM_SIDES = 3;

            for (let i = 0; i <= NUM_SIDES; i++) {
              const angle = (i / NUM_SIDES) * Math.PI * 2 - Math.PI / 2 + layerRotation;
              const radius = baseRadius * amplitudeMod * shrinkFactor;
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          }

          ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // Scanlines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        for (let y = 0; y < height; y += 3) {
          ctx.fillRect(0, y, width, 1);
        }

        // CRT overlay
        const curveGrad = ctx.createRadialGradient(
          width / 2, height / 2, height * 0.3,
          width / 2, height / 2, height
        );
        curveGrad.addColorStop(0, 'rgba(0,0,0,0)');
        curveGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = curveGrad;
        ctx.fillRect(0, 0, width, height);

      } else {
        // Idle state
        ctx.strokeStyle = themeConfig.glowColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = themeConfig.glowColor;
        ctx.beginPath();

        if (waveformType === 'line') {
          ctx.moveTo(centerX - baseRadius, centerY);
          ctx.lineTo(centerX + baseRadius, centerY);
        } else if (waveformType === 'circle') {
          ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        } else {
          for (let i = 0; i <= 3; i++) {
            const angle = (i / 3) * Math.PI * 2 - Math.PI / 2 + rotationRef.current;
            const x = centerX + Math.cos(angle) * baseRadius;
            const y = centerY + Math.sin(angle) * baseRadius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [audioContext, isPlaying, waveformType, theme, themeConfig]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}

// --- FILE EXPLORER COMPONENT ---
function FileExplorer({ files, currentFile, onSelect, onNew, onNewDemo, onDelete, onRename, onReset }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const startRename = (file) => {
    setEditingId(file.id);
    setEditName(file.name);
  };

  const finishRename = (file) => {
    if (editName.trim()) {
      onRename(file.id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <span>FILES</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="file-btn" onClick={onNew} title="New Empty File">+</button>
          <button className="file-btn demo" onClick={onNewDemo} title="New Demo File">D</button>
        </div>
      </div>
      <div className="file-list">
        {files.map(file => (
          <div
            key={file.id}
            className={`file-item ${currentFile?.id === file.id ? 'active' : ''}`}
            onClick={() => onSelect(file)}
          >
            {editingId === file.id ? (
              <input
                className="file-rename-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => finishRename(file)}
                onKeyDown={(e) => e.key === 'Enter' && finishRename(file)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="file-name">{file.name}</span>
                <div className="file-actions">
                  <button onClick={(e) => { e.stopPropagation(); startRename(file); }} title="Rename">R</button>
                  {files.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(file.id); }} title="Delete">X</button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="file-explorer-footer">
        <button className="file-btn reset" onClick={onReset} title="Reset All Files">RESET</button>
      </div>
    </div>
  );
}

// --- WAVEFORM SELECTOR ---
function WaveformSelector({ waveformType, onChange }) {
  return (
    <div className="waveform-selector">
      <span>WAVE:</span>
      <button
        className={waveformType === 'triangle' ? 'active' : ''}
        onClick={() => onChange('triangle')}
        title="Triangle"
      >
        △
      </button>
      <button
        className={waveformType === 'circle' ? 'active' : ''}
        onClick={() => onChange('circle')}
        title="Circle"
      >
        ○
      </button>
      <button
        className={waveformType === 'line' ? 'active' : ''}
        onClick={() => onChange('line')}
        title="Line"
      >
        ―
      </button>
    </div>
  );
}

// --- STORAGE HELPERS ---
const STORAGE_KEY = 'strudel_files';

function loadFiles() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load files:', e);
  }
  return [{ id: Date.now(), name: 'untitled.strudel', code: defaultCode }];
}

function saveFiles(files) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('Failed to save files:', e);
  }
}

// --- MAIN APP ---
function App() {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const currentFileRef = useRef(null); // Ref to track current file for closures
  const [audioCtx, setAudioCtx] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformType, setWaveformType] = useState('triangle');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'acid');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Initialize files only once
  const [files, setFiles] = useState(() => {
    const loaded = loadFiles();
    return loaded;
  });
  const [currentFile, setCurrentFile] = useState(() => files[0]);

  // Keep ref in sync with state
  useEffect(() => {
    currentFileRef.current = currentFile;
  }, [currentFile]);

  // Save files to localStorage whenever they change (but not on initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveFiles(files);
  }, [files]);

  const init = async () => {
    try {
      await initAudio();
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      setAudioCtx(ctx);
    } catch (err) {
      console.error(err);
    }
  };

  const togglePlay = async () => {
    if (!editorRef.current) return;

    if (isPlaying) {
      editorRef.current.stop();
      if (window.hush) window.hush();
      setIsPlaying(false);
    } else {
      await editorRef.current.evaluate();
      setIsPlaying(true);
    }
  };

  const saveCurrentFile = () => {
    const file = currentFileRef.current;
    if (!editorRef.current || !file) return;
    const code = editorRef.current.code; // Use .code property
    if (!code) return;
    setFiles(prev => prev.map(f =>
      f.id === file.id ? { ...f, code } : f
    ));
    setCurrentFile(prev => prev ? { ...prev, code } : prev);
    console.log('Saved:', file.name); // Debug log
  };

  const selectFile = (file) => {
    // Save current file before switching
    saveCurrentFile();
    setCurrentFile(file);
    if (editorRef.current && editorRef.current.setCode) {
      editorRef.current.setCode(file.code);
      console.log('Switched to:', file.name);
    }
  };

  const createNewFile = (useDemo = false) => {
    saveCurrentFile();
    const newFile = {
      id: Date.now(),
      name: useDemo ? `demo_${files.length + 1}.strudel` : `pattern_${files.length + 1}.strudel`,
      code: useDemo ? defaultCode : `// New Pattern\nsetcps(0.5);\n\n$: s("bd sd")\n   .analyze(1)\n`
    };
    setFiles(prev => [...prev, newFile]);
    setCurrentFile(newFile);
    if (editorRef.current && editorRef.current.setCode) {
      editorRef.current.setCode(newFile.code);
      console.log('Created new file:', newFile.name);
    }
  };

  const resetStorage = () => {
    if (window.confirm('This will delete all saved files and restore the default demo. Continue?')) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const deleteFile = (id) => {
    if (files.length <= 1) return;
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    if (currentFile?.id === id) {
      setCurrentFile(newFiles[0]);
      if (editorRef.current && editorRef.current.setCode) {
        editorRef.current.setCode(newFiles[0].code);
      }
    }
    console.log('Deleted file');
  };

  const renameFile = (id, newName) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, name: newName } : f
    ));
    if (currentFile?.id === id) {
      setCurrentFile(prev => ({ ...prev, name: newName }));
    }
  };

  // Insert code from AI into editor (supports append/merge or replace)
  const insertCode = (code, mode = 'append') => {
    if (editorRef.current && editorRef.current.setCode) {
      // Helper to refresh CodeMirror layout after code change
      const refreshEditor = () => {
        requestAnimationFrame(() => {
          editorRef.current?.editor?.requestMeasure();
        });
      };

      if (mode === 'replace') {
        editorRef.current.setCode(code);
        refreshEditor();
        console.log('Replaced code');
      } else {
        // Intelligent merge: combine patterns by type
        const currentCode = editorRef.current.code || '';

        // If current code is empty, just set the new code
        if (!currentCode.trim()) {
          editorRef.current.setCode(code);
          refreshEditor();
          console.log('Set code (was empty)');
          return;
        }

        // Parse setcps from both (prefer new one)
        const currentSetcps = currentCode.match(/setcps\([^)]+\);?\s*\n?/);
        const newSetcps = code.match(/setcps\([^)]+\);?\s*\n?/);

        // Parse all pattern blocks: // comment + $: line
        const patternRegex = /(\/\/[^\n]*\n)?\$:[^\n]+/g;

        const parsePatterns = (src) => {
          const patterns = {};
          let match;
          while ((match = patternRegex.exec(src)) !== null) {
            const block = match[0];
            const commentMatch = block.match(/\/\/\s*([^\n-]+)/);
            // Normalize key: lowercase, remove numbers, trim
            const key = commentMatch
              ? commentMatch[1].toLowerCase().replace(/[0-9]/g, '').trim()
              : `pattern_${Object.keys(patterns).length}`;
            patterns[key] = block;
          }
          return patterns;
        };

        const currentPatterns = parsePatterns(currentCode);
        const newPatterns = parsePatterns(code);

        // Merge: new patterns override current patterns of same type
        const merged = { ...currentPatterns, ...newPatterns };

        // Build final code
        const finalSetcps = newSetcps ? newSetcps[0].trim() : (currentSetcps ? currentSetcps[0].trim() : 'setcps(120/60/4);');
        const patternLines = Object.values(merged).join('\n');

        const mergedCode = `${finalSetcps}\n${patternLines}`;
        editorRef.current.setCode(mergedCode);
        refreshEditor();
        console.log('Merged patterns:', Object.keys(merged));
      }
    }
  };

  // Get current code from editor for AI context
  const getCurrentCode = () => {
    return editorRef.current?.code || currentFile?.code || '';
  };

  useEffect(() => {
    if (!containerRef.current || !audioCtx || editorRef.current) return;

    editorRef.current = new StrudelMirror({
      defaultOutput: webaudioOutput,
      getTime: () => audioCtx.currentTime,
      transpiler,
      root: containerRef.current,
      initialCode: currentFile?.code || defaultCode,
      drawTime: [-2, 2],
      drawContext: getDrawContext(),
      prebake,
      solo: true,
      onToggle: (val) => setIsPlaying(val),
      extensions: aiAutocomplete(),
    });

    // ResizeObserver to refresh CodeMirror when container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (editorRef.current?.editor) {
        editorRef.current.editor.requestMeasure();
      }
    });
    resizeObserver.observe(containerRef.current);

    // Auto-save on code change (debounced via interval)
    const autoSaveInterval = setInterval(() => {
      saveCurrentFile();
    }, 5000);

    return () => {
      resizeObserver.disconnect();
      clearInterval(autoSaveInterval);
      editorRef.current?.stop();
      editorRef.current?.clear();
    };
  }, [audioCtx]);

  if (!audioCtx) {
    return (
      <div className="loader-overlay">
        <h1 style={{ fontFamily: 'Orbitron', fontSize: '3rem', color: 'var(--primary-glow)', marginBottom: '20px' }}>
          codeandcyanide
        </h1>
        <button onClick={init} className="cy-btn">INITIALIZE SYSTEM</button>
      </div>
    );
  }

  return (
    <>
      <div className="scan-line-anim"></div>

      <div className="dashboard-container">
        {/* Header */}
        <div className="top-bar">
          <div className="logo-section">
            <span>codeandcyanide</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <ThemeSwitcher theme={theme} onChange={setTheme} />
            <WaveformSelector waveformType={waveformType} onChange={setWaveformType} />
            <button className="cy-btn save" onClick={saveCurrentFile}>SAVE</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span>AUDIO_ENGINE</span>
              <div className={`status-indicator ${audioCtx ? 'active' : ''}`} />
            </div>
            <button
              className={`cy-btn ${isPlaying ? 'stop' : ''}`}
              onClick={togglePlay}
            >
              {isPlaying ? 'HALT EXECUTION' : 'EXECUTE SEQUENCE'}
            </button>
          </div>
        </div>

        {/* File Explorer Sidebar */}
        <FileExplorer
          files={files}
          currentFile={currentFile}
          onSelect={selectFile}
          onNew={() => createNewFile(false)}
          onNewDemo={() => createNewFile(true)}
          onDelete={deleteFile}
          onRename={renameFile}
          onReset={resetStorage}
        />

        {/* Code Editor + Terminal Stack */}
        <div className="editor-terminal-stack">
          <div className="panel editor-panel">
            <div className="panel-label">SOURCE: {currentFile?.name}</div>
            <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
          </div>

          {/* AI Terminal */}
          <ChatTerminal
            currentCode={getCurrentCode()}
            onInsertCode={insertCode}
            files={files}
            currentFileName={currentFile?.name}
          />
        </div>

        {/* Visualizer */}
        <div className="panel visualizer-panel">
          <div className="panel-label">OSCILLOSCOPE</div>
          <AudioVisualizer audioContext={audioCtx} isPlaying={isPlaying} waveformType={waveformType} theme={theme} />
        </div>
      </div>
    </>
  );
}

export default App;

```

`assets/react.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-11.769-62.708c-13.355-7.7-35.196.329-57.254 19.526a171.23 171.23 0 0 0-6.375 5.848a155.866 155.866 0 0 0-4.241-3.917C100.759 3.829 77.587-4.822 63.673 3.233C50.33 10.957 46.379 33.89 51.995 62.588a170.974 170.974 0 0 0 1.892 8.48c-3.28.932-6.445 1.924-9.474 2.98C17.309 83.498 0 98.307 0 113.668c0 15.865 18.582 31.778 46.812 41.427a145.52 145.52 0 0 0 6.921 2.165a167.467 167.467 0 0 0-2.01 9.138c-5.354 28.2-1.173 50.591 12.134 58.266c13.744 7.926 36.812-.22 59.273-19.855a145.567 145.567 0 0 0 5.342-4.923a168.064 168.064 0 0 0 6.92 6.314c21.758 18.722 43.246 26.282 56.54 18.586c13.731-7.949 18.194-32.003 12.4-61.268a145.016 145.016 0 0 0-1.535-6.842c1.62-.48 3.21-.974 4.76-1.488c29.348-9.723 48.443-25.443 48.443-41.52c0-15.417-17.868-30.326-45.517-39.844Zm-6.365 70.984c-1.4.463-2.836.91-4.3 1.345c-3.24-10.257-7.612-21.163-12.963-32.432c5.106-11 9.31-21.767 12.459-31.957c2.619.758 5.16 1.557 7.61 2.4c23.69 8.156 38.14 20.213 38.14 29.504c0 9.896-15.606 22.743-40.946 31.14Zm-10.514 20.834c2.562 12.94 2.927 24.64 1.23 33.787c-1.524 8.219-4.59 13.698-8.382 15.893c-8.067 4.67-25.32-1.4-43.927-17.412a156.726 156.726 0 0 1-6.437-5.87c7.214-7.889 14.423-17.06 21.459-27.246c12.376-1.098 24.068-2.894 34.671-5.345a134.17 134.17 0 0 1 1.386 6.193ZM87.276 214.515c-7.882 2.783-14.16 2.863-17.955.675c-8.075-4.657-11.432-22.636-6.853-46.752a156.923 156.923 0 0 1 1.869-8.499c10.486 2.32 22.093 3.988 34.498 4.994c7.084 9.967 14.501 19.128 21.976 27.15a134.668 134.668 0 0 1-4.877 4.492c-9.933 8.682-19.886 14.842-28.658 17.94ZM50.35 144.747c-12.483-4.267-22.792-9.812-29.858-15.863c-6.35-5.437-9.555-10.836-9.555-15.216c0-9.322 13.897-21.212 37.076-29.293c2.813-.98 5.757-1.905 8.812-2.773c3.204 10.42 7.406 21.315 12.477 32.332c-5.137 11.18-9.399 22.249-12.634 32.792a134.718 134.718 0 0 1-6.318-1.979Zm12.378-84.26c-4.811-24.587-1.616-43.134 6.425-47.789c8.564-4.958 27.502 2.111 47.463 19.835a144.318 144.318 0 0 1 3.841 3.545c-7.438 7.987-14.787 17.08-21.808 26.988c-12.04 1.116-23.565 2.908-34.161 5.309a160.342 160.342 0 0 1-1.76-7.887Zm110.427 27.268a347.8 347.8 0 0 0-7.785-12.803c8.168 1.033 15.994 2.404 23.343 4.08c-2.206 7.072-4.956 14.465-8.193 22.045a381.151 381.151 0 0 0-7.365-13.322Zm-45.032-43.861c5.044 5.465 10.096 11.566 15.065 18.186a322.04 322.04 0 0 0-30.257-.006c4.974-6.559 10.069-12.652 15.192-18.18ZM82.802 87.83a323.167 323.167 0 0 0-7.227 13.238c-3.184-7.553-5.909-14.98-8.134-22.152c7.304-1.634 15.093-2.97 23.209-3.984a321.524 321.524 0 0 0-7.848 12.897Zm8.081 65.352c-8.385-.936-16.291-2.203-23.593-3.793c2.26-7.3 5.045-14.885 8.298-22.6a321.187 321.187 0 0 0 7.257 13.246c2.594 4.48 5.28 8.868 8.038 13.147Zm37.542 31.03c-5.184-5.592-10.354-11.779-15.403-18.433c4.902.192 9.899.29 14.978.29c5.218 0 10.376-.117 15.453-.343c-4.985 6.774-10.018 12.97-15.028 18.486Zm52.198-57.817c3.422 7.8 6.306 15.345 8.596 22.52c-7.422 1.694-15.436 3.058-23.88 4.071a382.417 382.417 0 0 0 7.859-13.026a347.403 347.403 0 0 0 7.425-13.565Zm-16.898 8.101a358.557 358.557 0 0 1-12.281 19.815a329.4 329.4 0 0 1-23.444.823c-7.967 0-15.716-.248-23.178-.732a310.202 310.202 0 0 1-12.513-19.846h.001a307.41 307.41 0 0 1-10.923-20.627a310.278 310.278 0 0 1 10.89-20.637l-.001.001a307.318 307.318 0 0 1 12.413-19.761c7.613-.576 15.42-.876 23.31-.876H128c7.926 0 15.743.303 23.354.883a329.357 329.357 0 0 1 12.335 19.695a358.489 358.489 0 0 1 11.036 20.54a329.472 329.472 0 0 1-11 20.722Zm22.56-122.124c8.572 4.944 11.906 24.881 6.52 51.026c-.344 1.668-.73 3.367-1.15 5.09c-10.622-2.452-22.155-4.275-34.23-5.408c-7.034-10.017-14.323-19.124-21.64-27.008a160.789 160.789 0 0 1 5.888-5.4c18.9-16.447 36.564-22.941 44.612-18.3ZM128 90.808c12.625 0 22.86 10.235 22.86 22.86s-10.235 22.86-22.86 22.86s-22.86-10.235-22.86-22.86s10.235-22.86 22.86-22.86Z"></path></svg>
```

`components/ChatMessage.jsx`:

```jsx
import React from 'react';
import { extractCodeBlocks } from '../services/ai';

/**
 * Individual chat message component
 * Handles rendering of user/assistant messages with code block detection
 */
function ChatMessage({ message, onInsertCode }) {
  const { role, content } = message;
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  // Parse content to separate text and code blocks
  const renderContent = () => {
    if (!content) return null;

    // Split by code blocks
    const parts = content.split(/(```(?:javascript|js)?\n[\s\S]*?```)/g);

    return parts.map((part, idx) => {
      // Check if this is a code block
      const codeMatch = part.match(/```(?:javascript|js)?\n([\s\S]*?)```/);

      if (codeMatch) {
        const code = codeMatch[1].trim();
        return (
          <div key={idx} className="chat-code-block">
            <pre><code>{code}</code></pre>
            {isAssistant && onInsertCode && (
              <button
                className="insert-code-btn"
                onClick={() => onInsertCode(code)}
                title="Insert this code into editor"
              >
                INSERT
              </button>
            )}
          </div>
        );
      }

      // Regular text - render with basic markdown
      if (part.trim()) {
        return (
          <div key={idx} className="chat-text">
            {part.split('\n').map((line, lineIdx) => (
              <p key={lineIdx}>{line || '\u00A0'}</p>
            ))}
          </div>
        );
      }

      return null;
    });
  };

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-header">
        <span className="message-role">{isUser ? 'YOU' : 'AI'}</span>
      </div>
      <div className="message-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default ChatMessage;

```

`components/ChatSidebar.jsx`:

```jsx
import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { streamChat, isConfigured } from '../services/ai';

/**
 * AI Chat Sidebar Component
 * Provides chat interface for Strudel coding assistance
 */
function ChatSidebar({ isOpen, onClose, currentCode, onInsertCode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    // Create assistant message placeholder for streaming
    const assistantMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Setup abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const allMessages = [...messages, userMessage];

      // Stream the response
      for await (const chunk of streamChat(allMessages, currentCode, abortControllerRef.current.signal)) {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content + chunk
          };
          return updated;
        });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled, remove empty assistant message
        setMessages(prev => prev.slice(0, -1));
      } else {
        setError(err.message);
        // Remove empty assistant message on error
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  const configured = isConfigured();

  return (
    <div className="chat-sidebar">
      <div className="chat-header">
        <span>AI ASSISTANT</span>
        <div className="chat-header-actions">
          <button onClick={handleClear} title="Clear chat">CLR</button>
          <button onClick={onClose} title="Close chat">X</button>
        </div>
      </div>

      {!configured ? (
        <div className="chat-not-configured">
          <p>AI not configured.</p>
          <p>Add VITE_CHUTES_API_KEY to your .env file.</p>
        </div>
      ) : (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <p>Ask me anything about Strudel!</p>
                <p className="chat-suggestions">Try:</p>
                <ul>
                  <li>"Make a techno beat"</li>
                  <li>"Add a bassline to my pattern"</li>
                  <li>"Explain what .lpf() does"</li>
                  <li>"Make it more interesting"</li>
                </ul>
              </div>
            )}
            {messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                message={msg}
                onInsertCode={onInsertCode}
              />
            ))}
            {error && (
              <div className="chat-error">
                Error: {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about music, patterns, effects..."
              disabled={isLoading}
              rows={2}
            />
            <div className="chat-input-actions">
              {isLoading ? (
                <button type="button" onClick={handleCancel} className="cancel-btn">
                  STOP
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()}>
                  SEND
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default ChatSidebar;

```

`components/ChatTerminal.jsx`:

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { streamChat, isConfigured, extractCodeBlocks } from '../services/ai';

/**
 * Terminal-style AI Chat Component
 * Positioned below the code editor with command-line aesthetic
 */
function ChatTerminal({ currentCode, onInsertCode, files = [], currentFileName = '' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [filePickerIndex, setFilePickerIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [pendingCode, setPendingCode] = useState(null); // For accept/reject feature
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingCode]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Parse @filename references from input
  const parseFileReferences = (text) => {
    const regex = /@(\S+)/g;
    const refs = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      refs.push(match[1]);
    }
    return refs;
  };

  // Get context files based on @ references
  const getContextFiles = (text) => {
    const refs = parseFileReferences(text);
    const contextFiles = [];

    for (const ref of refs) {
      const file = files.find(f =>
        f.name.toLowerCase() === ref.toLowerCase() ||
        f.name.toLowerCase().startsWith(ref.toLowerCase())
      );
      if (file) {
        contextFiles.push({ name: file.name, code: file.code });
      }
    }

    return contextFiles;
  };

  // Filter files for autocomplete based on current @ query
  const getFilteredFiles = () => {
    const beforeCursor = input.slice(0, cursorPosition);
    const atMatch = beforeCursor.match(/@(\S*)$/);

    if (!atMatch) return [];

    const query = atMatch[1].toLowerCase();
    return files.filter(f =>
      f.name.toLowerCase().includes(query) &&
      f.name !== currentFileName
    );
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    setInput(value);
    setCursorPosition(pos);

    // Check if we should show file picker
    const beforeCursor = value.slice(0, pos);
    const atMatch = beforeCursor.match(/@(\S*)$/);
    setShowFilePicker(!!atMatch);
    setFilePickerIndex(0);
  };

  const handleFileSelect = (fileName) => {
    const beforeCursor = input.slice(0, cursorPosition);
    const afterCursor = input.slice(cursorPosition);
    const atMatch = beforeCursor.match(/@(\S*)$/);

    if (atMatch) {
      const newBefore = beforeCursor.slice(0, -atMatch[0].length) + '@' + fileName + ' ';
      setInput(newBefore + afterCursor);
      setCursorPosition(newBefore.length);
    }

    setShowFilePicker(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    const contextFiles = getContextFiles(userInput);

    // Clean input by removing @references for display
    const cleanInput = userInput.replace(/@\S+\s*/g, '').trim();

    const userMessage = {
      role: 'user',
      content: userInput,
      displayContent: cleanInput,
      contextFiles: contextFiles.map(f => f.name),
      targetFile: currentFileName // Track which file this query is about
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);
    setShowFilePicker(false);

    // Create assistant message placeholder for streaming
    const assistantMessage = { role: 'assistant', content: '', targetFile: currentFileName };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();

      const allMessages = [...messages, { role: 'user', content: cleanInput }];

      // Stream the response with context files
      for await (const chunk of streamChat(
        allMessages,
        currentCode,
        contextFiles,
        abortControllerRef.current.signal
      )) {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content + chunk
          };
          return updated;
        });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } else {
        console.error('AI Error:', err);
        setError(err.message);
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
    setPendingCode(null);
  };

  const handleKeyDown = (e) => {
    if (showFilePicker) {
      const filteredFiles = getFilteredFiles();

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFilePickerIndex(i => Math.min(i + 1, filteredFiles.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFilePickerIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (filteredFiles.length > 0) {
          e.preventDefault();
          handleFileSelect(filteredFiles[filePickerIndex].name);
        }
      } else if (e.key === 'Escape') {
        setShowFilePicker(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Show code in diff view for accept/reject
  const handleReviewCode = (code) => {
    setPendingCode(code);
  };

  // Accept the pending code change
  const handleAcceptCode = () => {
    if (pendingCode) {
      onInsertCode?.(pendingCode);
      setPendingCode(null);
    }
  };

  // Reject the pending code change
  const handleRejectCode = () => {
    setPendingCode(null);
  };

  const configured = isConfigured();
  const filteredFiles = getFilteredFiles();

  // Render a message with code block detection
  const renderMessage = (msg, idx) => {
    const isUser = msg.role === 'user';
    const content = msg.content;

    // Split content into text and code blocks
    const parts = [];
    let lastIndex = 0;
    const codeBlockRegex = /```(?:javascript|js)?\n?([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      // Add code block
      parts.push({ type: 'code', content: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return (
      <div key={idx} className={`terminal-message ${isUser ? 'user' : 'assistant'}`}>
        <span className="terminal-prompt">{isUser ? '>' : '$'}</span>
        <div className="terminal-content">
          {isUser && msg.contextFiles?.length > 0 && (
            <span className="terminal-context">
              [{msg.contextFiles.join(', ')}]
            </span>
          )}
          {parts.length === 0 ? (
            <span>{content || (isUser ? '' : <span className="terminal-thinking">thinking...</span>)}</span>
          ) : (
            parts.map((part, i) => (
              part.type === 'code' ? (
                <div key={i} className="terminal-code-block">
                  <pre>{part.content}</pre>
                  <div className="terminal-code-actions">
                    <button
                      className="terminal-review-btn"
                      onClick={() => handleReviewCode(part.content)}
                    >
                      REVIEW
                    </button>
                    <button
                      className="terminal-append-btn"
                      onClick={() => onInsertCode?.(part.content, 'append')}
                    >
                      APPEND
                    </button>
                    <button
                      className="terminal-replace-btn"
                      onClick={() => onInsertCode?.(part.content, 'replace')}
                    >
                      REPLACE
                    </button>
                  </div>
                </div>
              ) : (
                <span key={i}>{part.content}</span>
              )
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`chat-terminal ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="terminal-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="terminal-title">
          <span className="terminal-indicator">●</span>
          AI TERMINAL
          {currentFileName && <span className="terminal-current-file">[ {currentFileName} ]</span>}
          {isLoading && <span className="terminal-loading">...</span>}
        </span>
        <div className="terminal-actions" onClick={e => e.stopPropagation()}>
          <button onClick={handleClear} title="Clear">CLR</button>
          <button onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {!configured ? (
            <div className="terminal-not-configured">
              <span className="terminal-prompt">!</span>
              <span>VITE_CHUTES_API_KEY not set. Check .env file.</span>
            </div>
          ) : (
            <>
              <div className="terminal-messages">
                {messages.length === 0 && (
                  <div className="terminal-welcome">
                    <div className="terminal-message system">
                      <span className="terminal-prompt">$</span>
                      <span>
                        Strudel AI ready. Working on: <strong>{currentFileName || 'no file'}</strong>
                        <br />
                        <span className="terminal-hint">Type @ to reference other files. Use REVIEW to preview changes.</span>
                      </span>
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => renderMessage(msg, idx))}
                {error && (
                  <div className="terminal-message error">
                    <span className="terminal-prompt">!</span>
                    <span>Error: {error}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending Code Review Panel */}
              {pendingCode && (
                <div className="terminal-review-panel">
                  <div className="review-header">
                    <span>Review changes for {currentFileName}</span>
                    <div className="review-actions">
                      <button className="review-accept" onClick={handleAcceptCode}>
                        ✓ ACCEPT
                      </button>
                      <button className="review-reject" onClick={handleRejectCode}>
                        ✗ REJECT
                      </button>
                    </div>
                  </div>
                  <div className="review-diff">
                    <div className="diff-old">
                      <div className="diff-label">CURRENT</div>
                      <pre>{currentCode || '// Empty file'}</pre>
                    </div>
                    <div className="diff-new">
                      <div className="diff-label">NEW</div>
                      <pre>{pendingCode}</pre>
                    </div>
                  </div>
                </div>
              )}

              <form className="terminal-input-area" onSubmit={handleSubmit}>
                <span className="terminal-input-prompt">{'>'}</span>
                <div className="terminal-input-wrapper">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isLoading ? 'Generating...' : `Ask about ${currentFileName || 'music patterns'}...`}
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  {showFilePicker && filteredFiles.length > 0 && (
                    <div className="terminal-file-picker">
                      {filteredFiles.map((file, idx) => (
                        <div
                          key={file.name}
                          className={`file-picker-item ${idx === filePickerIndex ? 'selected' : ''}`}
                          onClick={() => handleFileSelect(file.name)}
                        >
                          @{file.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isLoading ? (
                  <button type="button" onClick={handleCancel} className="terminal-btn cancel">
                    ^C
                  </button>
                ) : (
                  <button type="submit" disabled={!input.trim()} className="terminal-btn">
                    RUN
                  </button>
                )}
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ChatTerminal;

```

`components/ThemeSwitcher.jsx`:

```jsx
import React from 'react';

const THEMES = [
  { id: 'acid', name: 'ACID', color: '#00ff9d' },
  { id: 'orphic', name: 'ORPHIC', color: '#a855f7' },
  { id: 'basic-bitch', name: 'BASIC BITCH', color: '#000000' },
  { id: 'retard', name: 'RETARD', color: '#ffffff' }
];

function ThemeSwitcher({ theme, onChange }) {
  return (
    <div className="theme-switcher">
      <span>THEME:</span>
      {THEMES.map(t => (
        <button
          key={t.id}
          className={`theme-btn ${t.id} ${theme === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
          title={t.name}
        />
      ))}
    </div>
  );
}

export default ThemeSwitcher;

```

`extensions/autocomplete.js`:

```js
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

```

`index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Orbitron:wght@500;900&display=swap');

/* === THEME: ACID (Green & Black) === */
:root, [data-theme="acid"] {
  --bg-deep: #050505;
  --bg-panel: #0a0f0a;
  --bg-gradient-start: #0d120d;
  --bg-gradient-end: #000000;
  --glass-border: rgba(0, 255, 157, 0.3);
  --primary-glow: #00ff9d;
  --secondary-glow: #008f5d;
  --accent-glow: #00ffff;
  --accent-secondary: #ff00ff;
  --text-dim: #4a6b5d;
  --grid-line: rgba(0, 255, 157, 0.05);
  --error-color: #ff0055;
  --waveform-hue-start: 140;
  --waveform-hue-end: 180;
}

/* === THEME: ORPHIC (Purple & Black) === */
[data-theme="orphic"] {
  --bg-deep: #050508;
  --bg-panel: #0a0a12;
  --bg-gradient-start: #0d0d18;
  --bg-gradient-end: #000000;
  --glass-border: rgba(147, 51, 234, 0.3);
  --primary-glow: #a855f7;
  --secondary-glow: #7c3aed;
  --accent-glow: #c084fc;
  --accent-secondary: #f472b6;
  --text-dim: #6b5b7d;
  --grid-line: rgba(147, 51, 234, 0.05);
  --error-color: #f43f5e;
  --waveform-hue-start: 270;
  --waveform-hue-end: 300;
}

/* === THEME: RETARD (White & Black) === */
[data-theme="retard"] {
  --bg-deep: #ffffff;
  --bg-panel: #ffffff;
  --bg-gradient-start: #ffffff;
  --bg-gradient-end: #f8f8f8;
  --glass-border: rgba(0, 0, 0, 0.2);
  --primary-glow: #000000;
  --secondary-glow: #333333;
  --accent-glow: #444444;
  --accent-secondary: #666666;
  --text-dim: #666666;
  --grid-line: rgba(0, 0, 0, 0.08);
  --error-color: #cc0000;
  --waveform-hue-start: 0;
  --waveform-hue-end: 0;
}

/* === THEME: BASIC BITCH (Black & White - Dark Mode) === */
[data-theme="basic-bitch"] {
  --bg-deep: #000000;
  --bg-panel: #0a0a0a;
  --bg-gradient-start: #0a0a0a;
  --bg-gradient-end: #000000;
  --glass-border: rgba(255, 255, 255, 0.2);
  --primary-glow: #ffffff;
  --secondary-glow: #cccccc;
  --accent-glow: #aaaaaa;
  --accent-secondary: #888888;
  --text-dim: #666666;
  --grid-line: rgba(255, 255, 255, 0.05);
  --error-color: #ff4444;
  --waveform-hue-start: 0;
  --waveform-hue-end: 0;
}

/* ============================================
   BASIC BITCH THEME (Dark - Black/White)
   ============================================ */

/* Syntax highlighting - grayscale */
[data-theme="basic-bitch"] .tok-keyword {
  color: #ffffff !important;
  text-shadow: none !important;
}
[data-theme="basic-bitch"] .tok-string {
  color: #cccccc !important;
}
[data-theme="basic-bitch"] .tok-number {
  color: #aaaaaa !important;
}
[data-theme="basic-bitch"] .tok-comment {
  color: #666666 !important;
}
[data-theme="basic-bitch"] .tok-propertyName,
[data-theme="basic-bitch"] .tok-function {
  color: #dddddd !important;
}

/* ============================================
   RETARD THEME (Light - White/Black)
   ============================================ */

/* All panels - white background */
[data-theme="retard"] .glass-panel,
[data-theme="retard"] .editor-panel,
[data-theme="retard"] .chat-terminal,
[data-theme="retard"] .file-explorer,
[data-theme="retard"] .visualizer-panel {
  background: #ffffff !important;
  border-color: rgba(0, 0, 0, 0.3) !important;
}

/* File explorer */
[data-theme="retard"] .file-list {
  background: #f5f5f5 !important;
}
[data-theme="retard"] .file-item:hover {
  background: #e8e8e8 !important;
}
[data-theme="retard"] .file-item.active {
  background: #e0e0e0 !important;
}
[data-theme="retard"] .file-explorer-header {
  color: #333333 !important;
}

/* Terminal */
[data-theme="retard"] .terminal-header {
  background: #f8f8f8 !important;
}
[data-theme="retard"] .terminal-input-area {
  background: #f8f8f8 !important;
  border-top-color: rgba(0, 0, 0, 0.2) !important;
}
[data-theme="retard"] .terminal-input {
  background: #ffffff !important;
  color: #000000 !important;
}
[data-theme="retard"] .terminal-message {
  color: #000000 !important;
}
[data-theme="retard"] .terminal-prompt {
  color: #333333 !important;
}

/* Top bar */
[data-theme="retard"] .top-bar {
  background: #ffffff !important;
  border-bottom-color: rgba(0, 0, 0, 0.2) !important;
}
[data-theme="retard"] .logo-section {
  color: #000000 !important;
  text-shadow: none !important;
}

/* Panel labels */
[data-theme="retard"] .panel-label {
  background: rgba(0, 0, 0, 0.1) !important;
  color: #000000 !important;
}

/* Status indicator */
[data-theme="retard"] .status-indicator {
  background: #00aa00 !important;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-deep);
  color: var(--primary-glow);
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  /* Prevent any auto-zoom/resize */
  -webkit-text-size-adjust: 100%;
  -moz-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

/* Prevent zoom/scale on layout containers */
.dashboard-container,
.editor-terminal-stack,
.panel,
.chat-terminal {
  transform: none !important;
  zoom: 1 !important;
}

/* --- Layout Structure --- */
.dashboard-container {
  display: grid;
  grid-template-columns: 180px 1fr 0.6fr; /* File explorer + Editor/Terminal + Visualizer */
  grid-template-rows: 60px 1fr;
  gap: 16px;
  height: 100vh;
  padding: 20px;
  background: radial-gradient(circle at 50% 50%, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%);
}

/* --- Editor + Terminal Stack --- */
.editor-terminal-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.editor-terminal-stack .editor-panel {
  flex: 1;
  min-height: 200px;
}

/* --- AI Terminal --- */
.chat-terminal {
  background: rgba(5, 8, 5, 0.95);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-height: 180px;
  max-height: 300px;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.chat-terminal.collapsed {
  min-height: auto;
  max-height: auto;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--glass-border);
  cursor: pointer;
  user-select: none;
}

.terminal-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--primary-glow);
  display: flex;
  align-items: center;
  gap: 8px;
}

.terminal-indicator {
  font-size: 8px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.terminal-loading {
  animation: blink 0.8s infinite;
  color: #ff00ff;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.terminal-actions {
  display: flex;
  gap: 6px;
}

.terminal-actions button {
  background: transparent;
  border: 1px solid var(--glass-border);
  color: var(--text-dim);
  padding: 2px 8px;
  font-size: 9px;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
}

.terminal-actions button:hover {
  border-color: var(--primary-glow);
  color: var(--primary-glow);
}

.terminal-not-configured {
  padding: 15px;
  color: var(--text-dim);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.terminal-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.5;
  max-width: 100%;
}

.terminal-welcome {
  color: var(--text-dim);
}

.terminal-message {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  max-width: 100%;
  overflow: hidden;
}

.terminal-message.user .terminal-prompt {
  color: var(--primary-glow);
}

.terminal-message.assistant .terminal-prompt {
  color: #ff00ff;
}

.terminal-message.system .terminal-prompt {
  color: var(--text-dim);
}

.terminal-message.error .terminal-prompt {
  color: #ff0055;
}

.terminal-message.error {
  color: #ff0055;
}

.terminal-prompt {
  font-weight: bold;
  flex-shrink: 0;
}

.terminal-content {
  flex: 1;
  color: #aaa;
  word-break: break-word;
  overflow: hidden;
  min-width: 0;
}

.terminal-message.user .terminal-content {
  color: var(--primary-glow);
}

.terminal-context {
  color: #00ffff;
  font-size: 10px;
  margin-right: 6px;
}

.terminal-code-block {
  background: #0a0a0a;
  border: 1px solid var(--glass-border);
  border-radius: 4px;
  margin: 8px 0;
  overflow: hidden;
  max-width: 100%;
}

.terminal-code-block pre {
  margin: 0;
  padding: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.4;
  color: var(--primary-glow);
  white-space: pre;
  max-height: 300px;
  overflow-y: auto;
}

.terminal-insert-btn {
  display: block;
  width: 100%;
  padding: 6px;
  background: transparent;
  border: none;
  border-top: 1px solid var(--glass-border);
  color: #ff00ff;
  font-family: 'Orbitron', sans-serif;
  font-size: 9px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}

.terminal-insert-btn:hover {
  background: #ff00ff;
  color: #000;
}

.terminal-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--glass-border);
}

.terminal-input-prompt {
  color: var(--primary-glow);
  font-weight: bold;
}

.terminal-input-wrapper {
  flex: 1;
  position: relative;
}

.terminal-input-wrapper input {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--primary-glow);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  outline: none;
}

.terminal-input-wrapper input::placeholder {
  color: var(--text-dim);
}

.terminal-file-picker {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: rgba(10, 15, 10, 0.98);
  border: 1px solid var(--glass-border);
  border-radius: 4px;
  margin-bottom: 4px;
  max-height: 150px;
  overflow-y: auto;
  z-index: 100;
}

.file-picker-item {
  padding: 6px 12px;
  cursor: pointer;
  font-size: 11px;
  color: #00ffff;
}

.file-picker-item:hover,
.file-picker-item.selected {
  background: rgba(0, 255, 255, 0.1);
}

.terminal-btn {
  background: transparent;
  border: 1px solid var(--primary-glow);
  color: var(--primary-glow);
  padding: 4px 12px;
  font-family: 'Orbitron', sans-serif;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
}

.terminal-btn:hover:not(:disabled) {
  background: var(--primary-glow);
  color: #000;
}

.terminal-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.terminal-btn.cancel {
  border-color: #ff0055;
  color: #ff0055;
}

.terminal-btn.cancel:hover {
  background: #ff0055;
  color: #fff;
}

/* Terminal extras */
.terminal-current-file {
  color: #00ffff;
  font-size: 9px;
  margin-left: 8px;
}

.terminal-target-file {
  color: #ff00ff;
  font-size: 10px;
  margin-left: 8px;
}

.terminal-hint {
  color: var(--text-dim);
  font-size: 10px;
}

.terminal-thinking {
  color: #ff00ff;
  animation: blink 1s infinite;
}

.terminal-code-actions {
  display: flex;
  border-top: 1px solid var(--glass-border);
}

.terminal-code-actions button {
  flex: 1;
  padding: 6px;
  background: transparent;
  border: none;
  font-family: 'Orbitron', sans-serif;
  font-size: 9px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}

.terminal-review-btn {
  color: #00ffff;
  border-right: 1px solid var(--glass-border) !important;
}

.terminal-review-btn:hover {
  background: #00ffff;
  color: #000;
}

.terminal-append-btn {
  color: #00ff9d;
}

.terminal-append-btn:hover {
  background: #00ff9d;
  color: #000;
}

.terminal-replace-btn {
  color: #ff4444;
}

.terminal-replace-btn:hover {
  background: #ff4444;
  color: #000;
}

/* Review Panel - Diff View */
.terminal-review-panel {
  border-top: 2px solid #00ffff;
  background: rgba(0, 255, 255, 0.05);
  max-height: 250px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 255, 255, 0.1);
  font-size: 11px;
  color: #00ffff;
  font-family: 'Orbitron', sans-serif;
}

.review-actions {
  display: flex;
  gap: 8px;
}

.review-accept,
.review-reject {
  padding: 4px 12px;
  border: 1px solid;
  background: transparent;
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.review-accept {
  border-color: var(--primary-glow);
  color: var(--primary-glow);
}

.review-accept:hover {
  background: var(--primary-glow);
  color: #000;
}

.review-reject {
  border-color: #ff0055;
  color: #ff0055;
}

.review-reject:hover {
  background: #ff0055;
  color: #fff;
}

.review-diff {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.diff-old,
.diff-new {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.diff-old {
  border-right: 1px solid var(--glass-border);
  background: rgba(255, 0, 85, 0.03);
}

.diff-new {
  background: rgba(0, 255, 157, 0.03);
}

.diff-label {
  padding: 4px 8px;
  font-size: 9px;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1px;
  border-bottom: 1px solid var(--glass-border);
}

.diff-old .diff-label {
  color: #ff0055;
  background: rgba(255, 0, 85, 0.1);
}

.diff-new .diff-label {
  color: var(--primary-glow);
  background: rgba(0, 255, 157, 0.1);
}

.review-diff pre {
  flex: 1;
  margin: 0;
  padding: 8px;
  overflow: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  line-height: 1.4;
  color: #aaa;
  white-space: pre-wrap;
  word-break: break-word;
}

/* --- The Header --- */
.top-bar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 10px;
}

.logo-section {
  font-family: 'Orbitron', sans-serif;
  font-size: 24px;
  letter-spacing: 4px;
  text-shadow: 0 0 10px var(--primary-glow);
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  background: #333;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #222;
}

.status-indicator.active {
  background: var(--primary-glow);
  box-shadow: 0 0 10px var(--primary-glow), 0 0 20px var(--primary-glow);
}

/* --- Panels (Glass Look) --- */
.panel {
  background: rgba(10, 15, 10, 0.6);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(0, 255, 157, 0.05);
  backdrop-filter: blur(5px);
}

/* Editor panel */
.panel.editor-panel {
  overflow: hidden;
  contain: layout size;
}

.panel-label {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--glass-border);
  color: #000;
  font-size: 10px;
  padding: 2px 8px;
  font-weight: bold;
  border-bottom-left-radius: 8px;
  font-family: 'Orbitron', sans-serif;
  z-index: 10;
}

/* --- Editor Overrides --- */
.cm-editor {
  height: 100% !important;
  background: transparent !important;
}

.cm-scroller {
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  overflow-x: auto !important;
  overflow-y: auto !important;
  max-width: 100% !important;
}

.cm-content {
  font-size: 14px !important;
}

.cm-line {
  /* Let CodeMirror handle line wrapping naturally */
}

.cm-gutters {
  background: transparent !important;
  border-right: 1px solid var(--glass-border) !important;
  color: var(--text-dim) !important;
}

.cm-activeLine { background: rgba(0, 255, 157, 0.05) !important; }
.cm-cursor { border-left-color: var(--primary-glow) !important; }

/* Syntax Coloring - Default (dark themes) */
.tok-keyword { color: #fff !important; text-shadow: 0 0 5px #fff; }
.tok-string { color: #00ffff !important; }
.tok-number { color: #ff00ff !important; }
.tok-comment { color: #4a6b5d !important; font-style: italic; }
.tok-variableName { color: var(--primary-glow) !important; }
.tok-propertyName { color: var(--primary-glow) !important; }
.tok-function { color: var(--primary-glow) !important; }
.tok-operator { color: var(--primary-glow) !important; }
.tok-punctuation { color: var(--primary-glow) !important; }

/* RETARD THEME - uses dark code editor background, so default white text is visible */
/* No need to override text colors - CodeMirror's white/colored text works on dark bg */

/* --- Buttons --- */
.cy-btn {
  background: transparent;
  border: 1px solid var(--primary-glow);
  color: var(--primary-glow);
  padding: 8px 24px;
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cy-btn:hover {
  background: var(--primary-glow);
  color: #000;
  box-shadow: 0 0 15px var(--primary-glow);
}

.cy-btn.stop {
  border-color: #ff0055;
  color: #ff0055;
}

.cy-btn.stop:hover {
  background: #ff0055;
  color: #fff;
  box-shadow: 0 0 15px #ff0055;
}

/* --- Loading Screen --- */
.loader-overlay {
  position: absolute;
  inset: 0;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.scan-line-anim {
  width: 100%;
  height: 2px;
  background: var(--primary-glow);
  position: absolute;
  animation: scan 3s linear infinite;
  opacity: 0.3;
  pointer-events: none;
}

@keyframes scan {
  0% { top: 0%; }
  100% { top: 100%; }
}

/* --- File Explorer --- */
.file-explorer {
  background: rgba(10, 15, 10, 0.6);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(5px);
}

.file-explorer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--glass-border);
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-dim);
}

.file-btn {
  background: transparent;
  border: 1px solid var(--glass-border);
  color: var(--primary-glow);
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.file-btn:hover {
  background: var(--primary-glow);
  color: #000;
}

.file-btn.demo {
  border-color: #00ffff;
  color: #00ffff;
}

.file-btn.demo:hover {
  background: #00ffff;
  color: #000;
}

.file-btn.reset {
  width: 100%;
  border-color: #ff6666;
  color: #ff6666;
  font-size: 10px;
  padding: 6px;
}

.file-btn.reset:hover {
  background: #ff6666;
  color: #000;
}

.file-explorer-footer {
  padding: 8px;
  border-top: 1px solid var(--glass-border);
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  margin: 0 4px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 2px solid transparent;
}

.file-item:hover {
  background: rgba(0, 0, 0, 0.3);
}

.file-item.active {
  background: rgba(0, 0, 0, 0.5);
  border-left-color: var(--primary-glow);
}

.file-name {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.file-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.file-item:hover .file-actions {
  opacity: 1;
}

.file-actions button {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 6px;
}

.file-actions button:hover {
  color: var(--primary-glow);
}

.file-rename-input {
  background: transparent;
  border: 1px solid var(--primary-glow);
  color: var(--primary-glow);
  font-family: inherit;
  font-size: 11px;
  padding: 2px 4px;
  width: 100%;
  outline: none;
}

/* --- Waveform Selector --- */
.waveform-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-family: 'Orbitron', sans-serif;
  color: var(--text-dim);
}

.waveform-selector button {
  background: transparent;
  border: 1px solid var(--glass-border);
  color: var(--text-dim);
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.waveform-selector button:hover {
  border-color: var(--primary-glow);
  color: var(--primary-glow);
}

.waveform-selector button.active {
  background: var(--primary-glow);
  border-color: var(--primary-glow);
  color: #000;
  box-shadow: 0 0 10px var(--primary-glow);
}

/* --- Save Button --- */
.cy-btn.save {
  border-color: #00ffff;
  color: #00ffff;
}

.cy-btn.save:hover {
  background: #00ffff;
  color: #000;
  box-shadow: 0 0 15px #00ffff;
}

/* --- Editor Panel Adjustment --- */
/* Scrollbar styling is defined in the panel section above */

/* --- AI Button --- */
.cy-btn.ai {
  border-color: #ff00ff;
  color: #ff00ff;
}

.cy-btn.ai:hover,
.cy-btn.ai.active {
  background: #ff00ff;
  color: #000;
  box-shadow: 0 0 15px #ff00ff;
}

/* --- Chat Sidebar --- */
.chat-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  width: 380px;
  height: 100vh;
  background: rgba(5, 5, 5, 0.95);
  border-left: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--glass-border);
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  color: #ff00ff;
}

.chat-header-actions {
  display: flex;
  gap: 8px;
}

.chat-header-actions button {
  background: transparent;
  border: 1px solid var(--glass-border);
  color: var(--text-dim);
  padding: 4px 10px;
  font-size: 10px;
  cursor: pointer;
  font-family: 'Orbitron', sans-serif;
}

.chat-header-actions button:hover {
  border-color: var(--primary-glow);
  color: var(--primary-glow);
}

.chat-not-configured {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: var(--text-dim);
  text-align: center;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chat-welcome {
  color: var(--text-dim);
  font-size: 13px;
  padding: 20px;
  text-align: center;
}

.chat-welcome p:first-child {
  color: var(--primary-glow);
  font-size: 14px;
  margin-bottom: 15px;
}

.chat-suggestions {
  margin-top: 15px;
  font-size: 11px;
}

.chat-welcome ul {
  list-style: none;
  padding: 0;
  margin-top: 8px;
}

.chat-welcome li {
  padding: 6px 12px;
  margin: 4px 0;
  border: 1px solid var(--glass-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-welcome li:hover {
  border-color: var(--primary-glow);
  color: var(--primary-glow);
}

/* Chat Messages */
.chat-message {
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.chat-message.user {
  background: rgba(0, 255, 157, 0.1);
  border: 1px solid rgba(0, 255, 157, 0.3);
  margin-left: 20px;
}

.chat-message.assistant {
  background: rgba(255, 0, 255, 0.05);
  border: 1px solid rgba(255, 0, 255, 0.2);
  margin-right: 20px;
}

.message-header {
  margin-bottom: 8px;
}

.message-role {
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-dim);
}

.chat-message.user .message-role {
  color: var(--primary-glow);
}

.chat-message.assistant .message-role {
  color: #ff00ff;
}

.message-content {
  color: #ccc;
}

.message-content p {
  margin: 0 0 8px 0;
}

.message-content p:last-child {
  margin-bottom: 0;
}

/* Code blocks in chat */
.chat-code-block {
  background: #0a0a0a;
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  margin: 10px 0;
  overflow: hidden;
}

.chat-code-block pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.chat-code-block code {
  color: var(--primary-glow);
}

.insert-code-btn {
  display: block;
  width: 100%;
  padding: 8px;
  background: transparent;
  border: none;
  border-top: 1px solid var(--glass-border);
  color: #ff00ff;
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}

.insert-code-btn:hover {
  background: #ff00ff;
  color: #000;
}

.chat-error {
  padding: 10px 15px;
  background: rgba(255, 0, 85, 0.1);
  border: 1px solid rgba(255, 0, 85, 0.3);
  border-radius: 8px;
  color: #ff0055;
  font-size: 12px;
}

/* Chat Input */
.chat-input-area {
  padding: 15px;
  border-top: 1px solid var(--glass-border);
}

.chat-input-area textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  color: var(--primary-glow);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  padding: 12px;
  resize: none;
  outline: none;
}

.chat-input-area textarea:focus {
  border-color: var(--primary-glow);
}

.chat-input-area textarea::placeholder {
  color: var(--text-dim);
}

.chat-input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.chat-input-actions button {
  background: transparent;
  border: 1px solid var(--primary-glow);
  color: var(--primary-glow);
  padding: 8px 20px;
  font-family: 'Orbitron', sans-serif;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-input-actions button:hover:not(:disabled) {
  background: var(--primary-glow);
  color: #000;
}

.chat-input-actions button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.chat-input-actions .cancel-btn {
  border-color: #ff0055;
  color: #ff0055;
}

.chat-input-actions .cancel-btn:hover {
  background: #ff0055;
  color: #fff;
}

/* === THEME SWITCHER === */
.theme-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-family: 'Orbitron', sans-serif;
  color: var(--text-dim);
}

.theme-switcher span {
  letter-spacing: 1px;
}

.theme-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--glass-border);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.theme-btn:hover {
  transform: scale(1.1);
}

.theme-btn.active {
  border-color: var(--primary-glow);
  box-shadow: 0 0 10px var(--primary-glow);
}

.theme-btn.acid {
  background: linear-gradient(135deg, #00ff9d 0%, #008f5d 100%);
}

.theme-btn.orphic {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
}

.theme-btn.retard {
  background: linear-gradient(135deg, #ffffff 0%, #888888 100%);
}

.theme-btn.basic-bitch {
  background: linear-gradient(135deg, #333333 0%, #000000 100%);
}

/* Theme-aware accent colors */
.cy-btn.save {
  border-color: var(--accent-glow);
  color: var(--accent-glow);
}

.cy-btn.save:hover {
  background: var(--accent-glow);
  color: #000;
  box-shadow: 0 0 15px var(--accent-glow);
}

.cy-btn.ai {
  border-color: var(--accent-secondary);
  color: var(--accent-secondary);
}

.cy-btn.ai:hover,
.cy-btn.ai.active {
  background: var(--accent-secondary);
  color: #000;
  box-shadow: 0 0 15px var(--accent-secondary);
}

/* Theme-aware terminal colors */
.terminal-append-btn {
  color: var(--primary-glow) !important;
}

.terminal-append-btn:hover {
  background: var(--primary-glow) !important;
  color: var(--bg-deep) !important;
}

.terminal-replace-btn {
  color: var(--error-color) !important;
}

.terminal-replace-btn:hover {
  background: var(--error-color) !important;
  color: #fff !important;
}

.terminal-review-btn {
  color: var(--accent-glow) !important;
}

.terminal-review-btn:hover {
  background: var(--accent-glow) !important;
  color: #000 !important;
}

/* Retard theme - ensure button hover text is visible (WHITE text on BLACK bg) */
[data-theme="retard"] .cy-btn:hover,
[data-theme="retard"] .cy-btn.save:hover,
[data-theme="retard"] .file-btn:hover,
[data-theme="retard"] .terminal-btn:hover:not(:disabled),
[data-theme="retard"] .waveform-selector button:hover,
[data-theme="retard"] .waveform-selector button.active,
[data-theme="retard"] .loader-overlay .cy-btn:hover {
  background: #000000 !important;
  color: #ffffff !important;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3) !important;
}

/* Retard theme - syntax highlighting not needed (dark editor bg shows white text) */

/* Retard theme - editor and terminal backgrounds */
/* Using light gray background - need to override CodeMirror text to dark */
[data-theme="retard"] .cm-editor,
[data-theme="retard"] .cm-scroller,
[data-theme="retard"] .cm-content {
  background: #e8e8e8 !important;
}
[data-theme="retard"] .cm-gutters {
  background: #e0e0e0 !important;
  border-right-color: #cccccc !important;
}
[data-theme="retard"] .cm-lineNumbers .cm-gutterElement {
  color: #666666 !important;
}
[data-theme="retard"] .cm-activeLine {
  background: rgba(0, 0, 0, 0.06) !important;
}
[data-theme="retard"] .editor-panel {
  background: #e8e8e8 !important;
}
/* Force ALL text in editor to be dark for retard theme */
[data-theme="retard"] .cm-editor .cm-line,
[data-theme="retard"] .cm-editor .cm-line *,
[data-theme="retard"] .cm-editor .cm-content,
[data-theme="retard"] .cm-editor span {
  color: #000000 !important;
  text-shadow: none !important;
}
[data-theme="retard"] .cm-editor .tok-comment,
[data-theme="retard"] .cm-editor .tok-comment * {
  color: #666666 !important;
}
[data-theme="retard"] .loader-overlay {
  background: #ffffff !important;
}
[data-theme="retard"] .terminal-messages {
  background: rgba(255, 255, 255, 0.95) !important;
}

/* Retard theme - code blocks in terminal */
[data-theme="retard"] .terminal-code-block {
  background: #f0f0f0 !important;
  border-color: rgba(0, 0, 0, 0.2) !important;
}
[data-theme="retard"] .terminal-code-block pre {
  color: #000000 !important;
}
[data-theme="retard"] .chat-code-block {
  background: #f0f0f0 !important;
  border-color: rgba(0, 0, 0, 0.2) !important;
}
[data-theme="retard"] .chat-code-block code {
  color: #000000 !important;
}

/* Basic-bitch theme - button hover (white bg, black text for dark theme) */
[data-theme="basic-bitch"] .cy-btn:hover,
[data-theme="basic-bitch"] .cy-btn.save:hover,
[data-theme="basic-bitch"] .file-btn:hover,
[data-theme="basic-bitch"] .terminal-btn:hover:not(:disabled),
[data-theme="basic-bitch"] .waveform-selector button:hover,
[data-theme="basic-bitch"] .waveform-selector button.active,
[data-theme="basic-bitch"] .loader-overlay .cy-btn:hover {
  background: #ffffff !important;
  color: #000000 !important;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.3) !important;
}

```

`main.jsx`:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

`services/ai.js`:

```js
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

```

`services/knowledge.js`:

```js
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

```

`services/prompts.js`:

```js
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

```