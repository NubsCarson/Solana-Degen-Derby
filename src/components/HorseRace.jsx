import React, { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getTokenMarketCap } from '../utils/tokenUtils';
import './HorseRace.css';
import { database, ref, onValue, set, onDisconnect } from '../utils/firebase';

const FINISH_LINE_MCAP = 100000000; // 100 million
const TRACK_LENGTH = 1400; // pixels (increased from 1200)
const START_POSITION = 200; // pixels (stays the same)

const MILESTONES = [
  { cap: 1000000, label: '1M' },
  { cap: 10000000, label: '10M' },
  { cap: 25000000, label: '25M' },
  { cap: 50000000, label: '50M' },
  { cap: 75000000, label: '75M' }
];

const horses = [
  { 
    name: '🏆 STALLION', 
    tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    color: '#FF5733',
    image: '🐎',
    gradient: 'linear-gradient(45deg, #FF5733, #FF8C1A)'
  },
  { 
    name: '⚡ THUNDER', 
    tokenAddress: 'So11111111111111111111111111111111111111112', // SOL
    color: '#33FF57',
    image: '🏇',
    gradient: 'linear-gradient(45deg, #33FF57, #33FFB5)'
  },
  { 
    name: '💨 SWIFT', 
    tokenAddress: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
    color: '#3357FF',
    image: '🐎',
    gradient: 'linear-gradient(45deg, #3357FF, #33B5FF)'
  },
  { 
    name: '🌟 STAR', 
    tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    color: '#FF33F6',
    image: '🏇',
    gradient: 'linear-gradient(45deg, #FF33F6, #FF33B5)'
  },
  { 
    name: '🔥 BLAZE', 
    tokenAddress: '7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx', // ORCA
    color: '#FFB533',
    image: '🐎',
    gradient: 'linear-gradient(45deg, #FFB533, #FF5733)'
  },
  { 
    name: '💫 COMET', 
    tokenAddress: 'RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a', // RAY
    color: '#33FFF6',
    image: '🏇',
    gradient: 'linear-gradient(45deg, #33FFF6, #33B5FF)'
  },
  { 
    name: '⭐ NOVA', 
    tokenAddress: 'AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB', // GST
    color: '#FF3366',
    image: '🐎',
    gradient: 'linear-gradient(45deg, #FF3366, #FF336F)'
  },
  { 
    name: '🌈 RAINBOW', 
    tokenAddress: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac', // MNGO
    color: '#8833FF',
    image: '🏇',
    gradient: 'linear-gradient(45deg, #8833FF, #FF33F6)'
  },
  { 
    name: '✨ SPARK', 
    tokenAddress: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt', // SRM
    color: '#33FF99',
    image: '🐎',
    gradient: 'linear-gradient(45deg, #33FF99, #33FFB5)'
  },
  { 
    name: '🎯 ARROW', 
    tokenAddress: 'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT', // STEP
    color: '#FF9933',
    image: '🏇',
    gradient: 'linear-gradient(45deg, #FF9933, #FFB533)'
  }
];

const formatMarketCap = (marketCap) => {
  if (marketCap >= 1000000) {
    return `$${(marketCap / 1000000).toFixed(2)}M`;
  } else if (marketCap >= 1000) {
    return `$${(marketCap / 1000).toFixed(2)}K`;
  }
  return `$${marketCap.toFixed(2)}`;
};

const CONNECTION = new Connection(
    'https://misty-dimensional-film.solana-mainnet.quiknode.pro/a3fd984b10004b15fa8782cc8801d1fddf39cf40',
    'confirmed'
);

const HorseRace = () => {
  const [marketCaps, setMarketCaps] = useState({});
  const [loading, setLoading] = useState(true);
  const [winners, setWinners] = useState([]);
  const [isRaceStarted, setIsRaceStarted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [sounds, setSounds] = useState({
    gallop: null,
    finish: null,
    start: null
  });
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [walletAddress, setWalletAddress] = useState(null);
  const [provider, setProvider] = useState(null);

  const startRace = () => {
    setIsRaceStarted(true);
    setSoundEnabled(true);
  };

  useEffect(() => {
    if (!isRaceStarted) return;

    const fetchMarketCaps = async () => {
      setLoading(true);
      const caps = {};
      for (const horse of horses) {
        const mcap = await getTokenMarketCap(horse.tokenAddress);
        caps[horse.name] = mcap;
        
        if (mcap >= FINISH_LINE_MCAP && !winners.includes(horse.name)) {
          setWinners(prev => [...prev, horse.name]);
        }
      }
      setMarketCaps(caps);
      setLoading(false);
    };

    fetchMarketCaps();
    const interval = setInterval(fetchMarketCaps, 10000);
    return () => clearInterval(interval);
  }, [isRaceStarted, winners]);

  useEffect(() => {
    // Track online users
    const connectionsRef = ref(database, '.info/connected');
    const onlineUsersRef = ref(database, 'onlineUsers');

    const unsubscribe = onValue(connectionsRef, (snap) => {
      if (snap.val()) {
        // Add user to online count
        const userRef = ref(database, `onlineUsers/${Date.now()}`);
        set(userRef, true);

        // Remove user when disconnected
        onDisconnect(userRef).remove();
      }
    });

    // Listen for online users count
    const countUnsubscribe = onValue(onlineUsersRef, (snap) => {
      setOnlineUsers(snap.size || 0);
    });

    return () => {
      unsubscribe();
      countUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if ('solana' in window) {
      setProvider(window.solana);
    }
  }, []);

  const connectWallet = async () => {
    try {
      if (!provider) {
        alert('Please install Phantom wallet');
        return;
      }
      const resp = await provider.connect();
      setWalletAddress(resp.publicKey.toString());
    } catch (err) {
      console.error('Error connecting wallet:', err);
      alert('Please make sure you are on Solana Mainnet');
    }
  };

  const calculateHorsePosition = (marketCap) => {
    return START_POSITION + ((marketCap / FINISH_LINE_MCAP) * (TRACK_LENGTH - START_POSITION));
  };

  const calculateMilestonePosition = (cap) => {
    return START_POSITION + ((cap / FINISH_LINE_MCAP) * (TRACK_LENGTH - START_POSITION));
  };

  const getLeaderboard = () => {
    return Object.entries(marketCaps)
      .map(([name, cap]) => ({ name, cap }))
      .sort((a, b) => b.cap - a.cap)
      .slice(0, 10); // Changed from 5 to 10 to show all horses
  };

  // Update the scroll function to target the degen button
  const scrollToBottom = () => {
    const degenButton = document.querySelector('.degen-button-container');
    if (degenButton) {
      degenButton.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  if (!isRaceStarted) {
    return (
      <div className="start-screen">
        <button className="start-button" onClick={startRace}>
          🏁 START RACE 🏁
        </button>
      </div>
    );
  }

  if (loading && !Object.keys(marketCaps).length) {
    return <div className="loading">Loading race data...</div>;
  }

  return (
    <>
      <div className="header">
        <div className="online-counter">
          <div className="online-dot"></div>
          Degens Online: {onlineUsers}
        </div>
        <div className="wallet-connect">
          {!walletAddress ? (
            <button onClick={connectWallet}>
              Connect Phantom
            </button>
          ) : (
            <span className="wallet-address">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </span>
          )}
        </div>
      </div>
      
      <div className="race-wrapper">
        {/* Mile Markers Container */}
        <div className="mile-markers-container">
          <div className="mile-markers">
            {MILESTONES.map(({ cap, label }) => (
              <div 
                key={label}
                className="mile-marker"
                style={{ left: `${calculateMilestonePosition(cap)}px` }}
              >
                <div className="marker-line"></div>
                <div className="marker-label">${label}</div>
              </div>
            ))}
            <div className="finish-line">
              <div className="finish-text">FINISH: $100M</div>
            </div>
          </div>
        </div>

        {/* Race Container */}
        <div className="race-container">
          <div className="sound-toggle">
            <button onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>

          {/* Race Tracks with names inside */}
          {horses.map((horse, index) => {
            const position = calculateHorsePosition(marketCaps[horse.name] || 0);
            const hasFinished = (marketCaps[horse.name] || 0) >= FINISH_LINE_MCAP;
            
            return (
              <div key={horse.name} className="track">
                <div className="horse-info">
                  <div className="horse-details">
                    <div className="horse-name">{horse.name}</div>
                    <div className="market-cap">
                      {formatMarketCap(marketCaps[horse.name] || 0)}
                    </div>
                  </div>
                </div>
                <div 
                  className={`horse ${hasFinished ? 'finished' : ''}`}
                  style={{
                    left: `${position}px`,
                    background: horse.gradient,
                    transform: 'scaleX(-1)'
                  }}
                >
                  {horse.image}
                  {hasFinished && <div className="winner-crown">👑</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leaderboard stays at bottom */}
        <div className="leaderboard">
          <h2>🏆 Leaderboard</h2>
          <div className="leaderboard-list">
            {getLeaderboard().map((horse, index) => (
              <div key={horse.name} className="leaderboard-item">
                <span className="position">{index + 1}</span>
                <span className="name">{horse.name}</span>
                <span className="cap">{formatMarketCap(horse.cap)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="degen-pointer-container">
          <div 
            className="degen-pointer" 
            onClick={scrollToBottom}
            style={{ cursor: 'pointer' }}
          >
            ⬇️
          </div>
          <div className="pointer-text">
            DEGEN! 🐎 💰
          </div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="sparkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="degen-button-container">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="money-emoji"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            >
              {['💸', '💰', '💵', '🤑'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
          <button 
            className="degen-button"
            onClick={() => {
              document.querySelector('.degen-button').classList.add('activated');
              setTimeout(() => {
                document.querySelector('.degen-button').classList.remove('activated');
                window.location.href = '/menu';
              }, 3000);
            }}
          >
            <span className="button-text">🎰 DEGEN WAITING ROOM 🎰</span>
            <div className="button-particles"></div>
            <div className="button-glow"></div>
          </button>
        </div>
      </div>

      <div className="footer">
        <p>Solana Degen Derby © 2024 All Rights Reserved</p>
        <div className="social-links">
          <a href="https://discord.gg/YTTpbNN7" target="_blank" rel="noopener noreferrer">Discord</a>
          <a href="https://t.me/SolanaDegenDerby" target="_blank" rel="noopener noreferrer">Telegram</a>
          <a href="https://x.com/soldegenderby" target="_blank" rel="noopener noreferrer">Twitter</a>
          <a href="https://pump.fun" target="_blank" rel="noopener noreferrer">Pump.fun</a>
          <a href="https://dexscreener.com/solana" target="_blank" rel="noopener noreferrer">DexScreener</a>
        </div>
      </div>
    </>
  );
};

export default HorseRace; 