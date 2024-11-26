import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import './HorseFlip.css';

// Add Buffer polyfill
import { Buffer } from 'buffer';
window.Buffer = Buffer;

const NETWORK = 'devnet';
const CONNECTION = new Connection(
    'https://api.devnet.solana.com',
    'confirmed'
);
const LAMPORTS_PER_SOL = 1000000000;
const HOUSE_WALLET = new PublicKey('3BpjjjJujk6qsG6rRLdiR3Wfsgh3SdhyJ83W46VUyc3Q');

const HorseFlip = () => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState(null);
  const [betAmount, setBetAmount] = useState(0.1);
  const [balance, setBalance] = useState(0);
  const [selectedSide, setSelectedSide] = useState('heads');
  const [walletAddress, setWalletAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [sounds] = useState({
    win: new Audio('/sounds/win.mp3'),
    lose: new Audio('/sounds/lose.mp3')
  });
  const [isFirstFlip, setIsFirstFlip] = useState(true);
  const [isTransactionPending, setIsTransactionPending] = useState(false);

  useEffect(() => {
    if ('solana' in window) {
      setProvider(window.solana);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      updateBalance();
    }
  }, [walletAddress]);

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
      alert('Please make sure you are on Devnet network');
    }
  };

  const updateBalance = async () => {
    try {
      const balance = await CONNECTION.getBalance(new PublicKey(walletAddress));
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const getFlipResult = (betAmount, selectedSide) => {
    // First flip always loses
    if (isFirstFlip) {
      return selectedSide === 'heads' ? 'tails' : 'heads';
    }

    // After first flip, use normal probabilities
    const winProbability = betAmount >= 1 ? 0.2 : 0.3;
    const random = Math.random();
    const playerWins = random < winProbability;
    return playerWins ? selectedSide : (selectedSide === 'heads' ? 'tails' : 'heads');
  };

  const flip = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    if (betAmount > balance) {
      alert('Insufficient balance');
      return;
    }

    setIsFlipping(true);
    setIsTransactionPending(true);
    setResult(null);

    try {
      // Create transaction
      const transaction = new Transaction();
      const playerWallet = new PublicKey(walletAddress);
      
      // Add transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: playerWallet,
        toPubkey: HOUSE_WALLET,
        lamports: Math.floor(betAmount * LAMPORTS_PER_SOL)
      });

      transaction.add(transferInstruction);

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await CONNECTION.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = playerWallet;

      // Sign and send transaction
      const signed = await provider.signTransaction(transaction);
      const signature = await CONNECTION.sendRawTransaction(signed.serialize());
      
      // Wait for confirmation
      const confirmation = await CONNECTION.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      setIsTransactionPending(false);

      // Get rigged flip result based on bet amount and first flip
      const flipResult = getFlipResult(betAmount, selectedSide);
      
      setTimeout(() => {
        setResult(flipResult);
        setIsFlipping(false);
        setIsFirstFlip(false);
        
        // Handle win/loss with sound
        if (flipResult === selectedSide) {
          sounds.win.play().catch(console.error);
          alert(`You won ${betAmount * 2} SOL! 🎉`);
        } else {
          sounds.lose.play().catch(console.error);
          alert('Better luck next time! 😢');
        }
        
        updateBalance();
      }, 2000);

    } catch (err) {
      console.error('Error processing bet:', err);
      alert('Transaction failed: ' + err.message);
      setIsFlipping(false);
      setIsTransactionPending(false);
    }
  };

  // Add function to format number to 1 decimal place
  const formatBetAmount = (amount) => {
    return Math.round(amount * 10) / 10;
  };

  // Update bet controls
  const increaseBet = () => {
    setBetAmount(prev => formatBetAmount(Math.min(prev + 0.1, balance)));
  };

  const decreaseBet = () => {
    setBetAmount(prev => formatBetAmount(Math.max(0.1, prev - 0.1)));
  };

  const handleBetInputChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setBetAmount(formatBetAmount(Math.max(0.1, Math.min(value, balance))));
    }
  };

  return (
    <div className="horse-flip-container">
      <h1>🎠 Horse Flip 🎠</h1>
      
      {!walletAddress ? (
        <button className="connect-button" onClick={connectWallet}>
          Connect Phantom Wallet
        </button>
      ) : (
        <>
          <div className="wallet-info">
            <div>Wallet: {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</div>
            <div className="balance-display">
              Balance: {balance.toFixed(4)} SOL
            </div>
          </div>

          <div className="coin-container">
            <div className={`coin ${isTransactionPending ? 'continuous-flip' : isFlipping ? 'flipping' : ''} ${result ? result : ''}`}>
              <div className="side heads">🐎</div>
              <div className="side tails">🏇</div>
            </div>
          </div>

          <div className="controls">
            <div className="bet-controls">
              <button onClick={decreaseBet}>-</button>
              <input 
                type="number" 
                value={betAmount.toFixed(1)} // Format display to 1 decimal
                onChange={handleBetInputChange}
                step="0.1"
              />
              <button onClick={increaseBet}>+</button>
            </div>

            <div className="side-selection">
              <button 
                className={selectedSide === 'heads' ? 'selected' : ''} 
                onClick={() => setSelectedSide('heads')}
              >
                Heads 🐎
              </button>
              <button 
                className={selectedSide === 'tails' ? 'selected' : ''} 
                onClick={() => setSelectedSide('tails')}
              >
                Tails 🏇
              </button>
            </div>

            <button 
              className="flip-button" 
              onClick={flip} 
              disabled={isFlipping || betAmount > balance}
            >
              FLIP!
            </button>
          </div>
        </>
      )}

      {result && (
        <div className={`result ${result === selectedSide ? 'win' : 'lose'}`}>
          {result === selectedSide ? 'You Won!' : 'You Lost!'}
        </div>
      )}

      <button 
        className="back-button"
        onClick={() => window.history.back()}
      >
        Back to Race
      </button>
    </div>
  );
};

export default HorseFlip; 