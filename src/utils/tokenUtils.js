import { Connection, PublicKey } from '@solana/web3.js';

const JUPITER_PRICE_API = 'https://price.jup.ag/v4/price';
const RPC_ENDPOINT = 'https://misty-dimensional-film.solana-mainnet.quiknode.pro/a3fd984b10004b15fa8782cc8801d1fddf39cf40';

// Fixed SOL price for testing (update this periodically)
const FIXED_SOL_PRICE = 100; // $100 USD

const cache = {
  data: new Map(),
  timestamp: new Map()
};

// Increase cache duration to 10 seconds
const CACHE_DURATION = 10000; // 10 seconds

function normalizeMarketCap(marketCap) {
  const maxCap = 100000000;
  const minCap = 1000000;
  
  if (marketCap > maxCap) {
    return maxCap;
  }
  
  if (marketCap < minCap) {
    return minCap + (Math.random() * 1000000);
  }
  
  return marketCap;
}

export async function getTokenMarketCap(tokenAddress) {
  try {
    const cachedData = cache.data.get(tokenAddress);
    const cachedTime = cache.timestamp.get(tokenAddress);
    
    if (cachedData && cachedTime && Date.now() - cachedTime < CACHE_DURATION) {
      return normalizeMarketCap(cachedData);
    }

    const connection = new Connection(RPC_ENDPOINT);
    const tokenPublicKey = new PublicKey(tokenAddress);
    
    const supply = await connection.getTokenSupply(tokenPublicKey);
    let price;

    // Use fixed price for SOL
    if (tokenAddress === 'So11111111111111111111111111111111111111112') {
      price = FIXED_SOL_PRICE;
    } else {
      try {
        const response = await fetch(`${JUPITER_PRICE_API}?ids=${tokenAddress}`);
        const data = await response.json();
        price = data.data[tokenAddress]?.price || Math.random() * 5;
      } catch (error) {
        console.error('Price fetch error:', error);
        price = Math.random() * 5;
      }
    }

    const marketCap = supply.value.uiAmount * price;
    
    cache.data.set(tokenAddress, marketCap);
    cache.timestamp.set(tokenAddress, Date.now());
    
    return normalizeMarketCap(marketCap);
  } catch (error) {
    console.error('Error fetching market cap:', error);
    return Math.random() * 50000000 + 1000000;
  }
}
