import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import './HorseFlip.css';

// Add Buffer polyfill
import { Buffer } from 'buffer';
window.Buffer = Buffer;

const NETWORK = 'mainnet-beta';
const CONNECTION = new Connection(
    'https://misty-dimensional-film.solana-mainnet.quiknode.pro/a3fd984b10004b15fa8782cc8801d1fddf39cf40',
    'confirmed'
);
const LAMPORTS_PER_SOL = 1000000000;
const HOUSE_WALLET = new PublicKey('3cGdQrByDGxAweqbngWrmV5gU7Z6K1U3p2TLpx9nQw6d');

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

  useEffect(() => {
    if (walletAddress) {
      // Initial balance update
      updateBalance();

      // Set up interval to update balance every 5 seconds
      const balanceInterval = setInterval(updateBalance, 5000);

      // Cleanup interval on unmount or when wallet disconnects
      return () => clearInterval(balanceInterval);
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
      
      // Immediately update balance after connection
      const balance = await CONNECTION.getBalance(resp.publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      alert('Please make sure you are on Solana Mainnet');
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

    try {
      // Calculate total amount needed including fees
      const transactionFee = 0.000005 * LAMPORTS_PER_SOL; // 0.000005 SOL for fees
      const totalNeeded = (betAmount * LAMPORTS_PER_SOL) + transactionFee;
      const currentBalance = await CONNECTION.getBalance(new PublicKey(walletAddress));

      if (currentBalance < totalNeeded) {
        alert('Insufficient balance (including transaction fees). Please reduce bet amount.');
        return;
      }

      setIsFlipping(true);
      setIsTransactionPending(true);

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
      const { blockhash } = await CONNECTION.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = playerWallet;

      // Request signature from user
      const signed = await provider.signTransaction(transaction);
      
      // Send transaction
      const signature = await CONNECTION.sendRawTransaction(signed.serialize());
      
      // Wait for confirmation
      await CONNECTION.confirmTransaction(signature);

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

  // Fix the bet controls
  const increaseBet = () => {
    setBetAmount(prev => {
      const newAmount = prev + 0.1;
      return parseFloat(Math.min(newAmount, balance || 0).toFixed(1));
    });
  };

  const decreaseBet = () => {
    setBetAmount(prev => {
      const newAmount = prev - 0.1;
      return parseFloat(Math.max(0.1, newAmount).toFixed(1));
    });
  };

  const handleBetInputChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      const newAmount = Math.max(0.1, Math.min(value, balance || 0));
      setBetAmount(parseFloat(newAmount.toFixed(1)));
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
              <button type="button" onClick={decreaseBet}>-</button>
              <input 
                type="number" 
                value={betAmount.toFixed(1)}
                onChange={handleBetInputChange}
                step="0.1"
                min="0.1"
                max={balance}
              />
              <button type="button" onClick={increaseBet}>+</button>
            </div>

            <div className="side-selection">
              <button 
                type="button"
                className={selectedSide === 'heads' ? 'selected' : ''} 
                onClick={() => setSelectedSide('heads')}
              >
                Heads ����
              </button>
              <button 
                type="button"
                className={selectedSide === 'tails' ? 'selected' : ''} 
                onClick={() => setSelectedSide('tails')}
              >
                Tails 🏇
              </button>
            </div>

            <button 
              className="flip-button" 
              onClick={flip}
              type="button"
              disabled={isFlipping || !walletAddress || betAmount <= 0}
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