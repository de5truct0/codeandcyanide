import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AudioProvider } from './audio/AudioContext';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Explore from './pages/Explore';
import Upload from './pages/Upload';
import TrackDetail from './pages/TrackDetail';
import About from './pages/About';

function App() {
  return (
    <AudioProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/track/:id" element={<TrackDetail />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </AudioProvider>
  );
}

export default App;
