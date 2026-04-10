/**
 * Parasitic Messaging Protocol (PMP) Core Engine
 * 
 * This module handles:
 * 1. Entropy sourcing from blockchain networks
 * 2. Key derivation using transaction/block hashes
 * 3. Encryption/decryption of messages
 * 4. Dual-mode operation (active/passive)
 * 
 * No external dependencies except xrpl for blockchain interaction.
 */

// Configuration
const CONFIG = {
  // Blockchain endpoints (public, no API keys required)
  NETWORKS: {
    xrpl: 'wss://s2.ripple.com',           // Mainnet
    xrpl_testnet: 'wss://s.altnet.rippletest.net:51234',
    // Add more networks as needed
  },
  
  // Time slot duration in seconds (for passive mode)
  TIME_SLOT_DURATION: 300, // 5 minutes
  
  // Maximum number of transactions to scan for active mode
  MAX_TRANSACTIONS_TO_SCAN: 10,
  
  // Demo bot address for testing
  DEMO_BOT_ADDRESS: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'
};

/**
 * PMP Core Class
 */
class PMPCore {
  constructor(walletAddress, network = 'xrpl') {
    this.walletAddress = walletAddress;
    this.network = network;
    this.client = null;
  }

  /**
   * Initialize blockchain client connection
   */
  async initialize() {
    if (!this.client) {
      const endpoint = CONFIG.NETWORKS[this.network];
      this.client = new xrpl.Client(endpoint);
      await this.client.connect();
    }
  }

  /**
   * Disconnect from blockchain client
   */
  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  /**
   * Get current time slot (for passive mode)
   * @returns {number} Current time slot index
   */
  getCurrentTimeSlot() {
    return Math.floor(Date.now() / (CONFIG.TIME_SLOT_DURATION * 1000));
  }

  /**
   * Scan for user's recent transactions (active mode)
   * @param {number} limit - Maximum number of transactions to scan
   * @returns {Promise<Array>} Array of transaction hashes
   */
  async getRecentTransactionHashes(limit = CONFIG.MAX_TRANSACTIONS_TO_SCAN) {
    if (!this.client) await this.initialize();
    
    try {
      const response = await this.client.request({
        command: 'account_tx',
        account: this.walletAddress,
        limit: limit,
        ledger_index_min: -1,
        ledger_index_max: -1,
        binary: false,
        forward: false
      });
      
      const transactions = response.result.transactions || [];
      return transactions.map(tx => tx.tx.hash).filter(hash => hash);
    } catch (error) {
      console.warn('Failed to fetch transactions:', error.message);
      return [];
    }
  }

  /**
   * Get current ledger hash (for passive mode)
   * @returns {Promise<string>} Current ledger hash
   */
  async getCurrentLedgerHash() {
    if (!this.client) await this.initialize();
    
    try {
      const response = await this.client.request({
        command: 'ledger_current'
      });
      return response.result.ledger_hash;
    } catch (error) {
      console.error('Failed to get ledger hash:', error.message);
      throw error;
    }
  }

  /**
   * Determine which mode to use (active or passive)
   * Active mode: use user's own transaction hash
   * Passive mode: use current ledger hash
   * @returns {Promise<Object>} Mode info with entropy source
   */
  async determineMode(recipientAddress) {
    // Try active mode first (check for recent transactions)
    const transactionHashes = await this.getRecentTransactionHashes();
    
    if (transactionHashes.length > 0) {
      // Use the most recent transaction hash
      const latestTxHash = transactionHashes[0];
      return {
        mode: 'active',
        entropySource: latestTxHash,
        metadata: {
          transactionHash: latestTxHash,
          timestamp: Date.now()
        }
      };
    }
    
    // Fall back to passive mode
    const ledgerHash = await this.getCurrentLedgerHash();
    const timeSlot = this.getCurrentTimeSlot();
    
    return {
      mode: 'passive',
      entropySource: ledgerHash,
      metadata: {
        ledgerHash: ledgerHash,
        timeSlot: timeSlot,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Derive encryption key from entropy source
   * @param {string} entropySource - Transaction hash or ledger hash
   * @param {string} recipientAddress - Recipient's wallet address
   * @returns {Uint8Array} 32-byte encryption key
   */
  deriveKey(entropySource, recipientAddress) {
    // Create deterministic key from entropy + addresses
    // Sort addresses to ensure same key regardless of sender/receiver order
    const addresses = [this.walletAddress, recipientAddress].sort();
    const keySeed = `${entropySource}|${addresses[0]}|${addresses[1]}`;
    
    // Use SHA-256 to generate 32-byte key
    const encoder = new TextEncoder();
    const data = encoder.encode(keySeed);
    const hashBuffer = crypto.subtle.digest('SHA-256', data);
    
    // Convert to Uint8Array (compatible with TweetNaCl)
    return hashBuffer.then(buffer => new Uint8Array(buffer));
  }

  /**
   * Encrypt message using derived key
   * @param {string} plaintext - Message to encrypt
   * @param {Uint8Array} key - 32-byte encryption key
   * @returns {Object} Encrypted payload with nonce
   */
  async encryptMessage(plaintext, key) {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const messageBytes = naclUtil.decodeUTF8(plaintext);
    const ciphertext = nacl.secretbox(messageBytes, nonce, key);
    
    return {
      nonce: naclUtil.encodeBase64(nonce),
      ciphertext: naclUtil.encodeBase64(ciphertext),
      timestamp: Date.now()
    };
  }

  /**
   * Decrypt message using derived key
   * @param {Object} encryptedPayload - Encrypted payload with nonce and ciphertext
   * @param {Uint8Array} key - 32-byte decryption key
   * @returns {string|null} Decrypted message or null if failed
   */
  async decryptMessage(encryptedPayload, key) {
    try {
      const nonce = naclUtil.decodeBase64(encryptedPayload.nonce);
      const ciphertext = naclUtil.decodeBase64(encryptedPayload.ciphertext);
      const plaintext = nacl.secretbox.open(ciphertext, nonce, key);
      
      if (plaintext) {
        return naclUtil.encodeUTF8(plaintext);
      }
      return null;
    } catch (error) {
      console.warn('Decryption failed:', error.message);
      return null;
    }
  }

  /**
   * Send message to recipient (core logic only - transport handled externally)
   * @param {string} recipientAddress - Recipient's wallet address
   * @param {string} plaintext - Message to send
   * @returns {Promise<Object>} Payload ready for publication + metadata
   */
  async sendMessage(recipientAddress, plaintext) {
    // Determine mode and get entropy source
    const modeInfo = await this.determineMode(recipientAddress);
    
    // Derive encryption key
    const key = await this.deriveKey(modeInfo.entropySource, recipientAddress);
    
    // Encrypt message
    const encryptedPayload = await this.encryptMessage(plaintext, key);
    
    // Prepare payload for publication
    const publicationPayload = {
      ...encryptedPayload,
      sender: this.walletAddress,
      recipient: recipientAddress,
      mode: modeInfo.mode,
      // Include minimal metadata for recipient to reconstruct key
      entropyRef: modeInfo.mode === 'active' 
        ? { transactionHash: modeInfo.metadata.transactionHash }
        : { ledgerHash: modeInfo.metadata.ledgerHash, timeSlot: modeInfo.metadata.timeSlot }
    };
    
    return {
      payload: publicationPayload,
      metadata: modeInfo.metadata
    };
  }

  /**
   * Receive and decrypt message (core logic only - transport handled externally)
   * @param {Object} publicationPayload - Published payload from channel
   * @returns {Promise<string|null>} Decrypted message or null if failed
   */
  async receiveMessage(public
