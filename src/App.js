import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HorseRace from './components/HorseRace';
import Menu from './components/Menu';
import HorseFlip from './components/HorseFlip';
import ChatRoom from './components/ChatRoom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HorseRace />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/flip" element={<HorseFlip />} />
          <Route path="/chat" element={<ChatRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
