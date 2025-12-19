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
