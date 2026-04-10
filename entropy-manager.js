/**
 * Advanced Entropy Manager for PMP
 * 
 * Handles multi-network entropy sourcing with fallbacks,
 * entropy quality assessment, and efficient caching.
 */
class EntropyManager {
  constructor(walletAddress, config = {}) {
    this.walletAddress = walletAddress;
    this.config = {
      networks: config.networks || ['xrpl', 'ethereum', 'bitcoin'],
      cacheTTL: config.cacheTTL || 300000, // 5 minutes
      minEntropyQuality: config.minEntropyQuality || 0.8,
      ...config
    };
    
    this.cache = new Map();
    this.clients = new Map();
  }

  /**
   * Get high-quality entropy from multiple networks
   * Returns the best available entropy source based on recency and activity
   */
  async getOptimalEntropy(recipientAddress) {
    const cacheKey = `${this.walletAddress}|${recipientAddress}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.entropy;
    }

    // Try active mode across all networks
    const activeEntropy = await this.getActiveEntropy();
    if (activeEntropy && this.isHighQuality(activeEntropy)) {
      const entropy = this.buildEntropyObject('active', activeEntropy, recipientAddress);
      this.cache.set(cacheKey, { entropy, timestamp: Date.now() });
      return entropy;
    }

    // Fall back to passive mode with multi-network consensus
    const passiveEntropy = await this.getPassiveEntropy();
    const entropy = this.buildEntropyObject('passive', passiveEntropy, recipientAddress);
    this.cache.set(cacheKey, { entropy, timestamp: Date.now() });
    return entropy;
  }

  /**
   * Get active entropy from user's recent transactions across networks
   */
  async getActiveEntropy() {
    const results = await Promise.allSettled(
      this.config.networks.map(network => this.getNetworkActiveEntropy(network))
    );

    // Find the most recent transaction across all networks
    let bestEntropy = null;
    let bestTimestamp = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const { hash, timestamp, network } = result.value;
        if (timestamp > bestTimestamp) {
          bestTimestamp = timestamp;
          bestEntropy = { hash, timestamp, network, type: 'transaction' };
        }
      }
    });

    return bestEntropy;
  }

  /**
   * Get active entropy from a specific network
   */
  async getNetworkActiveEntropy(network) {
    try {
      const client = await this.getClient(network);
      const transactions = await this.fetchRecentTransactions(client, network);
      
      if (transactions.length > 0) {
        const latest = transactions[0];
        return {
          hash: latest.hash,
          timestamp: latest.timestamp || Date.now(),
          network
        };
      }
    } catch (error) {
      console.warn(`Failed to get active entropy from ${network}:`, error.message);
    }
    return null;
  }

  /**
   * Get passive entropy using multi-network consensus
   * Combines hashes from multiple networks for higher security
   */
  async getPassiveEntropy() {
    const timeSlot = Math.floor(Date.now() / 300000); // 5-minute slots
    const networkHashes = [];
    
    // Get current block/ledger hash from each network
    const promises = this.config.networks.map(async (network) => {
      try {
        const client = await this.getClient(network);
        const hash = await this.getCurrentBlockHash(client, network);
        networkHashes.push({ network, hash, timeSlot });
      } catch (error) {
        console.warn(`Failed to get passive entropy from ${network}:`, error.message);
      }
    });

    await Promise.allSettled(promises);
    
    // If we have hashes from multiple networks, combine them
    if (networkHashes.length >= 2) {
      const combinedHash = this.combineHashes(networkHashes.map(h => h.hash));
      return { hash: combinedHash, timeSlot, networks: networkHashes.map(h => h.network) };
    }
    
    // Fallback to single network
    if (networkHashes.length > 0) {
      return networkHashes[0];
    }
    
    throw new Error('Unable to source entropy from any network');
  }

  /**
   * Build standardized entropy object
   */
  buildEntropyObject(mode, entropyData, recipientAddress) {
    const addresses = [this.walletAddress, recipientAddress].sort();
    
    return {
      mode,
      keySeed: this.generateKeySeed(entropyData.hash, addresses),
      entropySource: entropyData,
      addresses,
      timestamp: Date.now()
    };
  }

  /**
   * Generate deterministic key seed from entropy and addresses
   */
  generateKeySeed(entropyHash, sortedAddresses) {
    return `${entropyHash}|${sortedAddresses.join('|')}`;
  }

  /**
   * Combine multiple hashes into a single high-entropy hash
   */
  combineHashes(hashes) {
    const combined = hashes.join('|');
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Assess entropy quality (simple heuristic)
   */
  isHighQuality(entropy) {
    // In production, implement proper entropy quality assessment
    // For now, assume any recent transaction is high quality
    const age = Date.now() - (entropy.timestamp || Date.now());
    return age < 300000; // Less than 5 minutes old
  }

  // Network-specific implementations
  async getClient(network) {
    if (!this.clients.has(network)) {
      const client = await this.createClient(network);
      this.clients.set(network, client);
    }
    return this.clients.get(network);
  }

  async createClient(network) {
    switch (network) {
      case 'xrpl':
        const xrplClient = new xrpl.Client('wss://s2.ripple.com');
        await xrplClient.connect();
        return { type: 'xrpl', client: xrplClient };
      case 'ethereum':
        // Use public RPC endpoint
        return { type: 'ethereum', url: 'https://cloudflare-eth.com' };
      case 'bitcoin':
        return { type: 'bitcoin', url: 'https://blockstream.info/api' };
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  async fetchRecentTransactions(client, network) {
    switch (network) {
      case 'xrpl':
        const response = await client.client.request({
          command: 'account_tx',
          account: this.walletAddress,
          limit: 5,
          ledger_index_min: -1,
          ledger_index_max: -1
        });
        return (response.result.transactions || []).map(tx => ({
          hash: tx.tx.hash,
          timestamp: tx.tx.date ? (tx.tx.date + 946684800) * 1000 : Date.now()
        }));
      // Add other network implementations as needed
      default:
        return [];
    }
  }

  async getCurrentBlockHash(client, network) {
    switch (network) {
      case 'xrpl':
        const response = await client.client.request({ command: 'ledger_current' });
        return response.result.ledger_hash;
      case 'ethereum':
        const ethResponse = await fetch(client.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBlockByNumber',
            params: ['latest', false],
            id: 1
          })
        });
        const ethData = await ethResponse.json();
        return ethData.result.hash;
      case 'bitcoin':
        const btcResponse = await fetch(`${client.url}/blocks/tip/hash`);
        return await btcResponse.text();
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  async close() {
    for (const [network, client] of this.clients) {
      if (client.client && typeof client.client.disconnect === 'function') {
        await client.client.disconnect();
     
