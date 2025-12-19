import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function About() {
  const [theme] = useState(() => localStorage.getItem('theme') || 'acid');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="about-page">
      <div className="scan-line-anim"></div>

      <div className="page-nav">
        <Link to="/" className="site-logo site-logo-medium">CODE&CYANIDE</Link>
        <nav className="breadcrumb-nav">
          <Link to="/" className="nav-link">HOME</Link>
          <span className="nav-separator">/</span>
          <span className="nav-current">ABOUT</span>
        </nav>
        <div className="nav-spacer"></div>
      </div>

      <div className="about-content">
        <h1 className="about-title">About</h1>
        <div className="about-text">
          <p>Content coming soon...</p>
        </div>
      </div>
    </div>
  );
}

export default About;
