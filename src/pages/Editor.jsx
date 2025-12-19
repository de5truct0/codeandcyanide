import React, { useEffect, useRef, useState } from 'react';
import { StrudelMirror } from '@strudel/codemirror';
import { getDrawContext } from '@strudel/draw';
import { webaudioOutput } from '@strudel/webaudio';
import { transpiler } from '@strudel/transpiler';
import { prebake } from '@strudel/repl/prebake.mjs';
import { analysers, getAnalyzerData } from 'superdough';
import ChatTerminal from '../components/ChatTerminal';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { aiAutocomplete } from '../extensions/autocomplete';
import { useAudio } from '../audio/AudioContext';

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
            lightness = 10 + depth * 40;
          } else if (saturation === 0) {
            lightness = 90 - depth * 50;
          } else {
            lightness = 55 - depth * 30;
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

// --- EDITOR PAGE ---
function Editor() {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const currentFileRef = useRef(null);
  const { audioContext, isPlaying, isInitialized, initialize, setRepl, stop } = useAudio();
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [waveformType, setWaveformType] = useState('triangle');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'acid');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Initialize files only once
  const [files, setFiles] = useState(() => loadFiles());
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

  const togglePlay = async () => {
    if (!editorRef.current) return;

    if (localIsPlaying) {
      editorRef.current.stop();
      if (window.hush) window.hush();
      setLocalIsPlaying(false);
    } else {
      await editorRef.current.evaluate();
      setLocalIsPlaying(true);
    }
  };

  const saveCurrentFile = () => {
    const file = currentFileRef.current;
    if (!editorRef.current || !file) return;
    const code = editorRef.current.code;
    if (!code) return;
    setFiles(prev => prev.map(f =>
      f.id === file.id ? { ...f, code } : f
    ));
    setCurrentFile(prev => prev ? { ...prev, code } : prev);
  };

  const selectFile = (file) => {
    saveCurrentFile();
    setCurrentFile(file);
    if (editorRef.current && editorRef.current.setCode) {
      editorRef.current.setCode(file.code);
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
  };

  const renameFile = (id, newName) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, name: newName } : f
    ));
    if (currentFile?.id === id) {
      setCurrentFile(prev => ({ ...prev, name: newName }));
    }
  };

  // Insert code from AI into editor
  const insertCode = (code, mode = 'append') => {
    if (editorRef.current && editorRef.current.setCode) {
      const refreshEditor = () => {
        requestAnimationFrame(() => {
          editorRef.current?.editor?.requestMeasure();
        });
      };

      if (mode === 'replace') {
        editorRef.current.setCode(code);
        refreshEditor();
      } else {
        const currentCode = editorRef.current.code || '';

        if (!currentCode.trim()) {
          editorRef.current.setCode(code);
          refreshEditor();
          return;
        }

        const currentSetcps = currentCode.match(/setcps\([^)]+\);?\s*\n?/);
        const newSetcps = code.match(/setcps\([^)]+\);?\s*\n?/);

        const patternRegex = /(\/\/[^\n]*\n)?\$:[^\n]+/g;

        const parsePatterns = (src) => {
          const patterns = {};
          let match;
          while ((match = patternRegex.exec(src)) !== null) {
            const block = match[0];
            const commentMatch = block.match(/\/\/\s*([^\n-]+)/);
            const key = commentMatch
              ? commentMatch[1].toLowerCase().replace(/[0-9]/g, '').trim()
              : `pattern_${Object.keys(patterns).length}`;
            patterns[key] = block;
          }
          return patterns;
        };

        const currentPatterns = parsePatterns(currentCode);
        const newPatterns = parsePatterns(code);
        const merged = { ...currentPatterns, ...newPatterns };

        const finalSetcps = newSetcps ? newSetcps[0].trim() : (currentSetcps ? currentSetcps[0].trim() : 'setcps(120/60/4);');
        const patternLines = Object.values(merged).join('\n');

        const mergedCode = `${finalSetcps}\n${patternLines}`;
        editorRef.current.setCode(mergedCode);
        refreshEditor();
      }
    }
  };

  const getCurrentCode = () => {
    return editorRef.current?.code || currentFile?.code || '';
  };

  useEffect(() => {
    if (!containerRef.current || !isInitialized || editorRef.current) return;

    editorRef.current = new StrudelMirror({
      defaultOutput: webaudioOutput,
      getTime: () => audioContext.currentTime,
      transpiler,
      root: containerRef.current,
      initialCode: currentFile?.code || defaultCode,
      drawTime: [-2, 2],
      drawContext: getDrawContext(),
      prebake,
      solo: true,
      onToggle: (val) => setLocalIsPlaying(val),
      extensions: aiAutocomplete(),
    });

    setRepl(editorRef.current);

    const resizeObserver = new ResizeObserver(() => {
      if (editorRef.current?.editor) {
        editorRef.current.editor.requestMeasure();
      }
    });
    resizeObserver.observe(containerRef.current);

    const autoSaveInterval = setInterval(() => {
      saveCurrentFile();
    }, 5000);

    return () => {
      resizeObserver.disconnect();
      clearInterval(autoSaveInterval);
      editorRef.current?.stop();
      editorRef.current?.clear();
    };
  }, [isInitialized, audioContext]);

  if (!isInitialized) {
    return (
      <div className="loader-overlay">
        <h1 style={{ fontFamily: 'Orbitron', fontSize: '3rem', color: 'var(--primary-glow)', marginBottom: '20px' }}>
          codeandcyanide
        </h1>
        <button onClick={initialize} className="cy-btn">INITIALIZE SYSTEM</button>
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
              <div className={`status-indicator ${audioContext ? 'active' : ''}`} />
            </div>
            <button
              className={`cy-btn ${localIsPlaying ? 'stop' : ''}`}
              onClick={togglePlay}
            >
              {localIsPlaying ? 'HALT EXECUTION' : 'EXECUTE SEQUENCE'}
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
          <AudioVisualizer audioContext={audioContext} isPlaying={localIsPlaying} waveformType={waveformType} theme={theme} />
        </div>
      </div>
    </>
  );
}

export default Editor;
