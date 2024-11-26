import React, { useState, useEffect, useRef } from 'react';
import { database, ref, onValue, push, set } from '../utils/firebase';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const messagesRef = ref(database, 'messages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.values(data)
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-50);
        setMessages(messageList);
        setTimeout(scrollToBottom, 100);
      }
    });

    if (window.solana?.isConnected) {
      setWalletAddress(window.solana.publicKey.toString());
    }

    return () => unsubscribe();
  }, []);

  const copyToClipboard = async (fullAddress) => {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatWalletAddress = (address) => {
    return address.slice(-5);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !walletAddress) return;

    const messagesRef = ref(database, 'messages');
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, {
      text: newMessage,
      timestamp: Date.now(),
      sender: formatWalletAddress(walletAddress),
      walletAddress // Store full address for copying
    });

    setNewMessage('');
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.solana) {
        alert('Please install Phantom wallet');
        return;
      }
      const resp = await window.solana.connect();
      setWalletAddress(resp.publicKey.toString());
    } catch (err) {
      console.error('Error connecting wallet:', err);
    }
  };

  return (
    <div className={`chat-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-header" onClick={() => setIsMinimized(!isMinimized)}>
        💬 Race Chat
        <button className="minimize-button">
          {isMinimized ? '🔼' : '🔽'}
        </button>
      </div>
      
      {!isMinimized && (
        <>
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div key={index} className="message">
                <span 
                  className="sender" 
                  onClick={() => copyToClipboard(msg.walletAddress)}
                  title="Click to copy full address"
                >
                  {msg.sender}
                  {copySuccess && <span className="copy-tooltip">{copySuccess}</span>}
                </span>
                <span className="text">{msg.text}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {walletAddress ? (
            <form onSubmit={handleSubmit} className="message-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                maxLength={100}
              />
              <button type="submit">Send</button>
            </form>
          ) : (
            <div className="connect-wallet-prompt">
              <button onClick={connectWallet} className="connect-wallet-button">
                Connect Wallet to Chat
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Chat; 