import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Icosahedron, Stars, Float, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { useAudio } from '../audio/AudioContext';
import { getCurrentUser, signOut } from '../services/auth';
import AuthModal from '../components/AuthModal';

const THEME_COLORS = {
  acid: { wire: '#00ff9d', surface: '#020805', glow: '#00ff9d', bg: '#000000', text: '#fff' },
  orphic: { wire: '#a855f7', surface: '#0a0a12', glow: '#a855f7', bg: '#050510', text: '#fff' },
  retard: { wire: '#000000', surface: '#ffffff', glow: '#333333', bg: '#ffffff', text: '#000' },
  'basic-bitch': { wire: '#ffffff', surface: '#000000', glow: '#ffffff', bg: '#000000', text: '#fff' }
};

// Orbiting rings around the sphere
function OrbitRings({ colors }) {
  const ring1 = useRef();
  const ring2 = useRef();
  const ring3 = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ring1.current) ring1.current.rotation.z = t * 0.3;
    if (ring2.current) ring2.current.rotation.z = -t * 0.2;
    if (ring3.current) ring3.current.rotation.x = t * 0.25;
  });

  return (
    <group>
      <mesh ref={ring1} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.2, 0.01, 16, 100]} />
        <meshBasicMaterial color={colors.wire} transparent opacity={0.3} />
      </mesh>
      <mesh ref={ring2} rotation={[Math.PI / 2.5, Math.PI / 4, 0]}>
        <torusGeometry args={[2.5, 0.008, 16, 100]} />
        <meshBasicMaterial color={colors.wire} transparent opacity={0.2} />
      </mesh>
      <mesh ref={ring3} rotation={[0, Math.PI / 3, Math.PI / 6]}>
        <torusGeometry args={[2.8, 0.005, 16, 100]} />
        <meshBasicMaterial color={colors.wire} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// Main icosahedron with all the cool effects
function GeometricCore({ colors }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const wireRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.1;
      meshRef.current.rotation.y = t * 0.15;
    }
    if (wireRef.current) {
      wireRef.current.rotation.x = t * 0.1;
      wireRef.current.rotation.y = t * 0.15;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
    }
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.3;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={groupRef} position={[4, 0, 0]} scale={2.5}>
        {/* Inner glow */}
        <mesh ref={glowRef} scale={1.3}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={colors.glow} transparent opacity={0.05} />
        </mesh>

        {/* Main solid icosahedron */}
        <Icosahedron ref={meshRef} args={[1, 1]}>
          <MeshDistortMaterial
            color={colors.surface}
            emissive={colors.glow}
            emissiveIntensity={0.4}
            roughness={0.2}
            metalness={0.9}
            distort={0.1}
            speed={2}
          />
        </Icosahedron>

        {/* Wireframe overlay */}
        <Icosahedron ref={wireRef} args={[1.08, 1]}>
          <meshBasicMaterial color={colors.wire} wireframe transparent opacity={0.4} />
        </Icosahedron>

        {/* Orbit rings */}
        <OrbitRings colors={colors} />
      </group>
    </Float>
  );
}

function Home() {
  const { initialize, isInitialized } = useAudio();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'acid');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  const colors = THEME_COLORS[theme] || THEME_COLORS.acid;

  useEffect(() => {
    getCurrentUser().then(setUser);

    // Listen for theme changes
    const handleStorage = () => setTheme(localStorage.getItem('theme') || 'acid');
    window.addEventListener('storage', handleStorage);

    // Also check periodically for same-tab changes
    const interval = setInterval(() => {
      const current = localStorage.getItem('theme') || 'acid';
      if (current !== theme) setTheme(current);
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [theme]);

  const handleStart = async () => {
    if (!isInitialized) await initialize();
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: colors.bg }}>
      {/* FULLSCREEN 3D CANVAS */}
      <Canvas
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 12], fov: 50 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[colors.bg]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={2} color={colors.glow} />
        <pointLight position={[-5, -5, 5]} intensity={1} color={colors.wire} />

        {/* Deep starfield */}
        <Stars radius={150} depth={100} count={8000} factor={5} saturation={0} fade speed={0.5} />
        <Stars radius={80} depth={50} count={3000} factor={3} saturation={0.1} fade speed={1} />

        {/* The cool icosahedron */}
        <GeometricCore colors={colors} />

        {/* Post-processing */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.1} intensity={2} radius={0.8} mipmapBlur />
          <ChromaticAberration offset={[0.0015, 0.0015]} />
          <Vignette offset={0.1} darkness={1.2} />
        </EffectComposer>
      </Canvas>

      {/* LEFT SIDE MENU */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '50%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingLeft: '80px',
        background: colors.bg === '#ffffff'
          ? 'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, transparent 100%)'
          : 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
        zIndex: 10
      }}>
        <h1 style={{
          fontFamily: 'Orbitron, monospace',
          fontWeight: 700,
          fontSize: '4.5rem',
          color: colors.text,
          lineHeight: 1,
          marginBottom: '10px',
          textShadow: `3px 3px 0 ${colors.glow}`
        }}>
          CODE<br/>&CYANIDE
        </h1>

        <p style={{
          fontFamily: 'Rajdhani, monospace',
          fontSize: '1.2rem',
          color: colors.text === '#000' ? '#555' : '#888',
          letterSpacing: '4px',
          marginBottom: '50px',
          textTransform: 'uppercase'
        }}>
          Algorithmic Sound Engine
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Link to="/editor" onClick={handleStart} className="menu-link">START ENGINE</Link>
          <Link to="/explore" className="menu-link">EXPLORE</Link>
          <Link to="/about" className="menu-link">ABOUT</Link>

          {!user ? (
            <button onClick={() => setShowAuth(true)} className="menu-link">LOGIN / SIGN UP</button>
          ) : (
            <>
              <span style={{ fontFamily: 'Rajdhani', color: colors.glow, fontSize: '0.9rem', letterSpacing: '2px' }}>
                PILOT: {user.username || user.email || 'UNKNOWN'}
              </span>
              <button onClick={handleLogout} className="menu-link" style={{ color: '#666' }}>LOGOUT</button>
            </>
          )}
        </nav>
      </div>

      {/* THEME SWITCHER - Bottom Right */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '30px',
        display: 'flex',
        gap: '10px',
        zIndex: 10,
        alignItems: 'center',
        background: colors.bg === '#ffffff'
          ? 'rgba(255, 255, 255, 0.8)'
          : 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '8px 14px',
        borderRadius: '6px',
        border: `1px solid ${colors.bg === '#ffffff' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`
      }}>
        <span style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: '0.6rem',
          color: colors.text === '#000' ? '#444' : '#777',
          letterSpacing: '1px'
        }}>THEME</span>
        {[
          { name: 'acid', color: '#00ff9d' },
          { name: 'orphic', color: '#a855f7' },
          { name: 'retard', color: '#ffffff' },
          { name: 'basic-bitch', color: '#111111' }
        ].map((t) => (
          <button
            key={t.name}
            onClick={() => {
              setTheme(t.name);
              localStorage.setItem('theme', t.name);
            }}
            title={t.name === 'basic-bitch' ? 'BASIC BITCH' : t.name.toUpperCase()}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: t.color,
              border: 'none',
              outline: theme === t.name
                ? `2px solid ${colors.glow}`
                : 'none',
              outlineOffset: '2px',
              cursor: 'pointer',
              transition: 'outline 0.15s ease',
              boxShadow: t.name === 'retard'
                ? 'inset 0 0 0 1px rgba(0,0,0,0.2)'
                : t.name === 'basic-bitch'
                  ? 'inset 0 0 0 1px rgba(255,255,255,0.2)'
                  : 'none',
              flexShrink: 0
            }}
          />
        ))}
      </div>

      {/* VERSION */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '80px',
        fontFamily: 'Rajdhani, monospace',
        color: '#444',
        fontSize: '0.85rem',
        zIndex: 10
      }}>
        v2.0.4 // SYSTEM READY
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(u) => { setUser(u); setShowAuth(false); }}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;700&display=swap');

        .menu-link {
          font-family: 'Orbitron', monospace;
          font-size: 1.8rem;
          color: ${colors.text === '#000' ? '#555' : '#666'};
          background: none;
          border: none;
          text-decoration: none;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
        }

        .menu-link:hover {
          color: ${colors.text};
          transform: translateX(20px);
          text-shadow: 0 0 20px ${colors.glow};
        }
      `}</style>
    </div>
  );
}

export default Home;
