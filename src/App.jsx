import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AudioProvider } from './audio/AudioContext';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Explore from './pages/Explore';
import Upload from './pages/Upload';

function App() {
  return (
    <AudioProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/upload" element={<Upload />} />
      </Routes>
    </AudioProvider>
  );
}

export default App;
