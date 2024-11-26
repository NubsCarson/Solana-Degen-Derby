import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Add this line at the top of your script.js file
const { Token, TOKEN_PROGRAM_ID } = solanaWeb3; // Adjust this line based on how you are importing the library

// Constants
const NETWORK = 'devnet';
const CONNECTION = new solanaWeb3.Connection(
    solanaWeb3.clusterApiUrl(NETWORK),
    'confirmed'
);
const LAMPORTS_PER_SOL = 1000000000;
const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const EXCHANGE_RATE = 100; // Adjust this rate as needed

// State variables
let walletAddress = null;
let provider = null;

// DOM Elements
const connectButton = document.getElementById('connect-wallet');
const balanceElement = document.getElementById('balance');
const betInput = document.getElementById('bet-input');
const quickAmountButtons = document.querySelectorAll('.quick-amounts button');
const chooseFrogButton = document.getElementById('choose-frog');
const chooseFlyButton = document.getElementById('choose-fly');
const coin = document.querySelector('.coin');
const flipHistory = document.querySelector('.flip-history');

// Add this after initializing DOM elements
const showNetworkInstructions = () => {
    alert(
        "Please ensure your Phantom wallet is set to Devnet:\n\n" +
        "1. Open Phantom wallet\n" +
        "2. Click the gear icon (Settings)\n" +
        "3. Click 'Change Network'\n" +
        "4. Select 'Devnet'\n" +
        "5. Try connecting again"
    );
};

// Initialize
async function initialize() {
    if ('solana' in window) {
        provider = window.solana;
        if (provider.isPhantom) {
            connectButton.addEventListener('click', async () => {
                try {
                    await connectWallet();
                } catch (err) {
                    showNetworkInstructions();
                }
            });
            setupEventListeners();
        }
    } else {
        connectButton.textContent = 'Phantom Not Installed';
        connectButton.disabled = true;
        alert('Please install Phantom wallet to use this app');
    }
}

// Connect Wallet
async function connectWallet() {
    try {
        // Request the user to connect their wallet
        const resp = await provider.connect();
        walletAddress = resp.publicKey.toString();

        // Check if we're on devnet
        const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'));
        try {
            const version = await connection.getVersion();
            console.log('Connection to devnet successful:', version);
        } catch (err) {
            console.error('Failed to connect to devnet:', err);
            showNetworkInstructions();
            return;
        }

        // Update UI
        connectButton.textContent = walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4);
        balanceElement.classList.remove('hidden');
        await updateBalance();
    } catch (err) {
        console.error('Error connecting wallet:', err);
        if (err.code === 4001) {
            alert('Please accept the connection request in your wallet');
        } else {
            showNetworkInstructions();
        }
    }
}

// Update Balance
async function updateBalance() {
    try {
        const balance = await CONNECTION.getBalance(new solanaWeb3.PublicKey(walletAddress));
        const solBalance = balance / LAMPORTS_PER_SOL;
        balanceElement.textContent = `Balance: ${solBalance.toFixed(4)} SOL`;
    } catch (err) {
        console.error('Error fetching balance:', err);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    quickAmountButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.textContent === 'MAX') {
                // Set max amount (implement based on balance)
                return;
            }
            betInput.value = button.textContent;
        });
    });

    chooseFrogButton.addEventListener('click', () => placeBet('frog'));
    chooseFlyButton.addEventListener('click', () => placeBet('fly'));
}

// Update the verifyNetwork function to be more reliable
async function verifyNetwork() {
    try {
        const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'));
        const version = await connection.getVersion();
        return version !== null;
    } catch (error) {
        console.error('Network verification failed:', error);
        return false;
    }
}

// Place Bet
async function placeBet(choice) {
    if (!walletAddress) {
        alert('Please connect your wallet first');
        return;
    }

    // Add network verification
    const isDevnet = await verifyNetwork();
    if (!isDevnet) {
        alert('Please switch to Devnet network in your Phantom wallet settings');
        return;
    }

    const betAmount = parseFloat(betInput.value);
    if (isNaN(betAmount) || betAmount <= 0) {
        alert('Please enter a valid bet amount');
        return;
    }

    // Disable buttons during transaction
    chooseFrogButton.disabled = true;
    chooseFlyButton.disabled = true;

    try {
        // Create a new transaction
        const transaction = new solanaWeb3.Transaction();
        
        // Get the house wallet
        const houseWallet = new solanaWeb3.PublicKey('3BpjjjJujk6qsG6rRLdiR3Wfsgh3SdhyJ83W46VUyc3Q');
        const playerWallet = new solanaWeb3.PublicKey(walletAddress);
        
        // Create transfer instruction
        const transferInstruction = solanaWeb3.SystemProgram.transfer({
            fromPubkey: playerWallet,
            toPubkey: houseWallet,
            lamports: Math.floor(betAmount * LAMPORTS_PER_SOL)
        });

        transaction.add(transferInstruction);

        // Get the latest blockhash
        const { blockhash, lastValidBlockHeight } = await CONNECTION.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = playerWallet;

        try {
            // Request signature from user
            const signed = await provider.signTransaction(transaction);
            const signature = await CONNECTION.sendRawTransaction(signed.serialize());
            
            // Wait for transaction confirmation
            const confirmation = await CONNECTION.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            });

            if (confirmation.value.err) {
                throw new Error('Transaction failed');
            }

            console.log('Transaction successful:', signature);

            // Simulate coin flip (in production, this should be handled by a smart contract)
            const result = Math.random() < 0.5 ? 'frog' : 'fly';
            
            // Animate coin
            coin.classList.add('flipping');
            
            setTimeout(async () => {
                coin.classList.remove('flipping');
                
                // Determine win/loss
                const won = choice === result;
                
                // Update history
                addToHistory(choice, result, betAmount, won);
                
                // Show result
                alert(won ? 'You won! 🎉' : 'You lost! 😢');
                
                // Re-enable buttons
                chooseFrogButton.disabled = false;
                chooseFlyButton.disabled = false;
                
                // Update balance
                await updateBalance();
            }, 3000);

        } catch (err) {
            console.error('Transaction signing failed:', err);
            alert('Transaction was not approved');
            chooseFrogButton.disabled = false;
            chooseFlyButton.disabled = false;
        }

    } catch (err) {
        console.error('Error processing bet:', err);
        alert('Transaction failed: ' + err.message);
        
        // Re-enable buttons
        chooseFrogButton.disabled = false;
        chooseFlyButton.disabled = false;
    }
}

// Add to History
function addToHistory(choice, result, amount, won) {
    const historyEntry = document.createElement('div');
    historyEntry.className = 'flip-entry';
    historyEntry.innerHTML = `
        <div>
            <div>Bet: ${amount} SOL</div>
            <div>Choice: ${choice}</div>
        </div>
        <div style="color: ${won ? '#2ecc71' : '#e74c3c'}">${won ? 'Won' : 'Lost'}</div>
    `;
    
    flipHistory.insertBefore(historyEntry, flipHistory.firstChild);
    
    // Keep only last 10 entries
    if (flipHistory.children.length > 10) {
        flipHistory.removeChild(flipHistory.lastChild);
    }
}

// Initialize the app
initialize(); 

// Add these helper functions
async function getAssociatedTokenAddress(mint, owner) {
    return (await solanaWeb3.PublicKey.findProgramAddress(
        [
            owner.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
    ))[0];
}

async function createTradeTransaction(
    sellerTokenMint,
    buyerTokenMint,
    sellerAmount,
    buyerAmount,
    buyerPubkey
) {
    try {
        const seller = new solanaWeb3.PublicKey(walletAddress);
        const buyer = new solanaWeb3.PublicKey(buyerPubkey);

        // Get associated token accounts
        const sellerTokenAccount = await getAssociatedTokenAddress(sellerTokenMint, seller);
        const buyerTokenAccount = await getAssociatedTokenAddress(buyerTokenMint, buyer);
        const sellerReceiveAccount = await getAssociatedTokenAddress(buyerTokenMint, seller);
        const buyerReceiveAccount = await getAssociatedTokenAddress(sellerTokenMint, buyer);

        // Create transaction
        const transaction = new solanaWeb3.Transaction();

        // Add token transfer instructions
        transaction.add(
            createTransferInstruction(
                sellerTokenAccount,
                buyerReceiveAccount,
                seller,
                sellerAmount
            ),
            createTransferInstruction(
                buyerTokenAccount,
                sellerReceiveAccount,
                buyer,
                buyerAmount
            )
        );

        return transaction;
    } catch (error) {
        console.error('Error creating trade transaction:', error);
        throw error;
    }
}

// Update the createTradeListing function
async function createTradeListing() {
    if (!walletAddress) {
        alert('Please connect your wallet first');
        return;
    }

    const solAmount = parseFloat(document.getElementById('sol-amount').value);
    const tokenMint = document.getElementById('token-mint').value;

    if (isNaN(solAmount) || solAmount <= 0) {
        alert('Please enter a valid amount of SOL to trade');
        return;
    }

    try {
        // Get the associated token account for the specified mint
        const tokenMintPublicKey = new solanaWeb3.PublicKey(tokenMint);
        const tokenAccount = await getAssociatedTokenAddress(tokenMintPublicKey, new solanaWeb3.PublicKey(walletAddress));

        // Check if the token account exists
        const tokenAccountInfo = await CONNECTION.getAccountInfo(tokenAccount);
        if (!tokenAccountInfo) {
            // If the token account does not exist, create it
            const token = new Token(CONNECTION, tokenMintPublicKey, TOKEN_PROGRAM_ID, provider);
            await token.createAccount(new solanaWeb3.PublicKey(walletAddress));
            console.log('Created new token account:', tokenAccount.toString());
        }

        // Now get the balance of the token account
        const tokenBalance = await CONNECTION.getTokenAccountBalance(tokenAccount);
        const tokenAmount = solAmount * EXCHANGE_RATE; // Calculate the amount of tokens to receive

        if (tokenBalance.value.uiAmount < tokenAmount) {
            alert('Insufficient token balance');
            return;
        }

        // Create the trade transaction
        const transaction = await createTradeTransaction(
            tokenMintPublicKey,
            walletAddress,
            tokenAmount,
            solAmount,
            walletAddress
        );

        // Sign and send the transaction
        const { blockhash } = await CONNECTION.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new solanaWeb3.PublicKey(walletAddress);

        const signed = await provider.signTransaction(transaction);
        const signature = await CONNECTION.sendRawTransaction(signed.serialize());
        
        await CONNECTION.confirmTransaction(signature);

        console.log('Trade executed successfully:', signature);
        alert('Trade completed!');

    } catch (error) {
        console.error('Error creating trade listing:', error);
        alert('Failed to create trade listing');
    }
}

// Update the event listener for the create trade button
document.getElementById('create-trade-btn').addEventListener('click', createTradeListing); 