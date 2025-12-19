import React, { useEffect, useRef, useState } from 'react';

function MiniWaveform({ isPlaying, trackId }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [bars] = useState(() => {
    // Generate random static bar heights
    const barCount = 40;
    return Array.from({ length: barCount }, () => Math.random() * 0.7 + 0.1);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const barWidth = width / bars.length;
    const gap = 2;

    // Get theme color
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryGlow = computedStyle.getPropertyValue('--primary-glow').trim() || '#00ff9d';

    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      bars.forEach((baseHeight, i) => {
        let barHeight;

        if (isPlaying) {
          // Animated: wave effect when playing
          const wave = Math.sin((frame * 0.1) + (i * 0.3)) * 0.3 + 0.5;
          barHeight = baseHeight * wave * height * 0.8;
        } else {
          // Static bars when not playing
          barHeight = baseHeight * height * 0.4;
        }

        const x = i * barWidth + gap / 2;
        const y = (height - barHeight) / 2;

        // Gradient for bars
        const gradient = ctx.createLinearGradient(x, y + barHeight, x, y);
        if (isPlaying) {
          gradient.addColorStop(0, primaryGlow);
          gradient.addColorStop(1, `${primaryGlow}88`);
        } else {
          gradient.addColorStop(0, '#333');
          gradient.addColorStop(1, '#222');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - gap, barHeight);
      });

      frame++;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, bars]);

  return (
    <canvas
      ref={canvasRef}
      className="mini-waveform"
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}

export default MiniWaveform;
