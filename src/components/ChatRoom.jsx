import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  database, 
  storage, 
  ref, 
  storageRef, 
  onValue, 
  set, 
  push, 
  onDisconnect,
  uploadBytes,
  getDownloadURL 
} from '../utils/firebase';
import EmojiPicker from 'emoji-picker-react';
import './ChatRoom.css';
import { getNameAccountKey, NameRegistryState, getHashedName } from "@bonfida/spl-name-service";
import { Connection, PublicKey } from "@solana/web3.js";

// Add this near the top with other imports
const CONNECTION = new Connection(
    'https://api.devnet.solana.com',
    'confirmed'
);

// Add new components for file upload and emoji picker
const FileUpload = ({ onFileSelect }) => {
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="file-upload">
      <label htmlFor="file-input" className="file-button">
        📎
      </label>
      <input
        id="file-input"
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*"
      />
    </div>
  );
};

// Add this helper function
const formatDisplayName = (address) => {
  return address.slice(-5);
};

const ChatRoom = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [walletAddress, setWalletAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [username, setUsername] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const typingTimeoutRef = useRef({});
  const [isLoadingDomain, setIsLoadingDomain] = useState(false);
  const domainCache = useRef(new Map());

  useEffect(() => {
    if ('solana' in window) {
      setProvider(window.solana);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const messagesRef = ref(database, 'messages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.values(data);
        setMessages(messageList);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update the getSolDomain function
  const getSolDomain = async (address) => {
    try {
      setIsLoadingDomain(true);
      const connection = new Connection("https://api.mainnet-beta.solana.com");

      // Reverse lookup to find .sol domain
      const hashedName = await getHashedName(address);
      const nameAccountKey = await getNameAccountKey(
        hashedName,
        undefined,
        new PublicKey("58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx") // SOL TLD Authority
      );

      const nameAccount = await NameRegistryState.retrieve(
        connection,
        nameAccountKey
      );

      if (nameAccount && nameAccount.owner) {
        const domain = await nameAccount.reverse();
        if (domain) {
          return domain + '.sol';
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching .sol domain:', error);
      return null;
    } finally {
      setIsLoadingDomain(false);
    }
  };

  // Update the connectWallet function
  const connectWallet = async () => {
    try {
      if (!provider) {
        alert('Please install Phantom wallet');
        return;
      }
      const resp = await provider.connect();
      const address = resp.publicKey.toString();
      setWalletAddress(address);
      setUsername(address.slice(-5)); // Set temporary username

      // Try to get .sol domain
      const solDomain = await getSolDomain(address);
      if (solDomain) {
        setUsername(solDomain);
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      alert('Please make sure you are on Devnet network');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !walletAddress) return;

    const messageRef = ref(database, 'messages');
    const newMessageRef = push(messageRef);
    
    await set(newMessageRef, {
      text: newMessage,
      sender: username,
      walletAddress: walletAddress,
      timestamp: Date.now()
    });

    setNewMessage('');
  };

  // Add emoji to message
  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    try {
      const fileRef = storageRef(storage, `chat-images/${Date.now()}-${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      
      const messageRef = ref(database, 'messages');
      const newMessageRef = push(messageRef);
      
      await set(newMessageRef, {
        type: 'image',
        url: downloadURL,
        sender: username,
        walletAddress: walletAddress,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!walletAddress) return;
    
    const typingRef = ref(database, `typing/${walletAddress}`);
    set(typingRef, true);
    
    if (typingTimeoutRef.current[walletAddress]) {
      clearTimeout(typingTimeoutRef.current[walletAddress]);
    }
    
    typingTimeoutRef.current[walletAddress] = setTimeout(() => {
      set(typingRef, false);
    }, 2000);
  };

  // Listen for typing indicators
  useEffect(() => {
    const typingRef = ref(database, 'typing');
    const unsubscribe = onValue(typingRef, (snapshot) => {
      setIsTyping(snapshot.val() || {});
    });
    
    return () => unsubscribe();
  }, []);

  // Track online users
  useEffect(() => {
    if (!walletAddress) return;

    const userRef = ref(database, `online/${walletAddress}`);
    set(userRef, {
      username,
      lastSeen: Date.now()
    });

    onDisconnect(userRef).remove();

    const onlineRef = ref(database, 'online');
    const unsubscribe = onValue(onlineRef, (snapshot) => {
      const users = snapshot.val() || {};
      setOnlineUsers(Object.entries(users).map(([id, user]) => ({
        id,
        ...user
      })));
    });

    return () => unsubscribe();
  }, [walletAddress, username]);

  // Delete message (only own messages)
  const deleteMessage = async (messageId, messageWalletAddress) => {
    if (messageWalletAddress === walletAddress) {
      const messageRef = ref(database, `messages/${messageId}`);
      await set(messageRef, null);
    }
  };

  if (!walletAddress) {
    return (
      <div className="chatroom-container">
        <h1>🗣️ Degen Chat 🗣️</h1>
        <div className="connect-prompt">
          <button 
            className={`connect-button ${isLoadingDomain ? 'loading' : ''}`} 
            onClick={connectWallet}
            disabled={isLoadingDomain}
          >
            {isLoadingDomain ? 'Loading Domain...' : 'Connect Wallet to Chat'}
          </button>
        </div>
        <button className="back-button" onClick={() => navigate('/menu')}>
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="chatroom-container">
      <h1>🗣️ Degen Chat 🗣️</h1>
      
      <div className="wallet-info">
        Chatting as: {username}
      </div>

      <div className="online-users">
        <h3>Online Users ({onlineUsers.length})</h3>
        {onlineUsers.map(user => (
          <div key={user.id} className="online-user">
            {user.username}
          </div>
        ))}
      </div>

      <div className="messages-container">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.walletAddress === walletAddress ? 'own-message' : ''}`}
          >
            <div className="message-header">
              <span 
                className="sender" 
                title={message.walletAddress}
                onClick={() => navigator.clipboard.writeText(message.walletAddress)}
              >
                {formatDisplayName(message.walletAddress)}
                <span className="copy-tooltip">Click to copy full address</span>
              </span>
              <span className="timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {message.type === 'image' ? (
              <img src={message.url} alt="Shared" className="message-image" />
            ) : (
              <div className="message-text">{message.text}</div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="typing-indicator">
        {Object.entries(isTyping).map(([id, isTyping]) => 
          isTyping && id !== walletAddress ? (
            <div key={id} className="typing">
              Someone is typing...
            </div>
          ) : null
        )}
      </div>

      <form onSubmit={sendMessage} className="message-form">
        <FileUpload onFileSelect={handleFileUpload} />
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Type your message..."
          maxLength={280}
        />
        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          😊
        </button>
        <button type="submit" disabled={!newMessage.trim()}>
          Send 💬
        </button>
      </form>

      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}

      <button className="back-button" onClick={() => navigate('/menu')}>
        Back to Menu
      </button>
    </div>
  );
};

export default ChatRoom; 