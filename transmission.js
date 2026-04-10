/**
 * PMP Message Transmission System
 * Handles the complete flow from encryption to publication
 */

class PMPTransmission {
  constructor(senderWallet, entropyManager) {
    this.senderWallet = senderWallet;
    this.entropyManager = entropyManager;
  }

  /**
   * Complete send process: from plaintext to published payload
   */
  async send(recipientAddress, plaintext, options = {}) {
    // Step 1: Get optimal entropy for this recipient
    const entropy = await this.entropyManager.getOptimalEntropy(recipientAddress);
    
    // Step 2: Derive encryption key
    const key = await this.deriveKey(entropy.keySeed);
    
    // Step 3: Encrypt message
    const encrypted = await this.encryptMessage(plaintext, key);
    
    // Step 4: Prepare publication payload
    const payload = this.preparePublicationPayload(
      encrypted,
      recipientAddress,
      entropy
    );
    
    // Step 5: Publish through selected channels
    const publicationResults = await this.publishToChannels(
      payload,
      options.channels || ['ipfs']
    );
    
    return {
      payload,
      publicationResults,
      entropyMode: entropy.mode,
      timestamp: Date.now()
    };
  }

  /**
   * Derive encryption key from key seed
   */
  async deriveKey(keySeed) {
    const encoder = new TextEncoder();
    const data = encoder.encode(keySeed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }

  /**
   * Encrypt message with XSalsa20-Poly1305
   */
  async encryptMessage(plaintext, key) {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const messageBytes = naclUtil.decodeUTF8(plaintext);
    const ciphertext = nacl.secretbox(messageBytes, nonce, key);
    
    return {
      nonce: naclUtil.encodeBase64(nonce),
      ciphertext: naclUtil.encodeBase64(ciphertext)
    };
  }

  /**
   * Prepare minimal publication payload
   * Contains ONLY what receiver needs to decrypt
   */
  preparePublicationPayload(encrypted, recipientAddress, entropy) {
    // In active mode, we only need to reference the transaction
    if (entropy.mode === 'active') {
      return {
        type: 'pmp_v1',
        mode: 'active',
        sender: this.senderWallet,
        recipient: recipientAddress,
        nonce: encrypted.nonce,
        ciphertext: encrypted.ciphertext,
        // Reference to entropy source
        txRef: entropy.entropySource.hash,
        timestamp: Date.now()
      };
    }
    
    // In passive mode, include time slot for entropy reconstruction
    return {
      type: 'pmp_v1',
      mode: 'passive',
      sender: this.senderWallet,
      recipient: recipientAddress,
      nonce: encrypted.nonce,
      ciphertext: encrypted.ciphertext,
      // References for entropy reconstruction
      ledgerRef: entropy.entropySource.hash,
      timeSlot: entropy.entropySource.timeSlot,
      timestamp: Date.now()
    };
  }

  /**
   * Publish to multiple public channels simultaneously
   */
  async publishToChannels(payload, channels) {
    const results = {};
    
    // Try all channels in parallel
    const promises = channels.map(channel => 
      this.publishToChannel(channel, payload)
        .then(result => ({ channel, success: true, result }))
        .catch(error => ({ channel, success: false, error: error.message }))
    );
    
    const outcomes = await Promise.allSettled(promises);
    
    // Collect results
    outcomes.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        const { channel, success, result, error } = outcome.value;
        results[channel] = { success, result, error };
      } else {
        results[channels[index]] = { 
          success: false, 
          error: outcome.reason?.message || 'Unknown error' 
        };
      }
    });
    
    return results;
  }

  /**
   * Publish to a specific channel
   */
  async publishToChannel(channelType, payload) {
    switch (channelType) {
      case 'ipfs':
        // Using public IPFS gateway
        const response = await fetch('https://ipfs.infura.io:5001/api/v0/add', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        return { cid: data.Hash };
        
      case '
