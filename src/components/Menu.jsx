import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Menu.css';

const Menu = () => {
  const navigate = useNavigate();

  return (
    <div className="menu-container">
      <h1>🎮 Degen Menu 🎮</h1>
      
      <div className="menu-options">
        <div className="menu-card" onClick={() => navigate('/flip')}>
          <div className="card-icon">🎰</div>
          <h2>Horse Flip</h2>
          <p>Flip coins and win SOL!</p>
          <div className="card-glow"></div>
        </div>

        <div className="menu-card" onClick={() => navigate('/chat')}>
          <div className="card-icon">💭</div>
          <h2>Public Chat</h2>
          <p>Chat with fellow degens!</p>
          <div className="card-glow"></div>
        </div>
      </div>

      <button 
        className="back-button"
        onClick={() => navigate('/')}
      >
        Back to Race
      </button>
    </div>
  );
};

export default Menu; 