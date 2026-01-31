// DynamicSigner - Bridges EVM wallets (via Dynamic.xyz) to Linera's Signer interface

import type { Signer } from '@linera/client';

/**
 * A Dynamic wallet interface that supports personal_sign
 */
export interface DynamicWallet {
  signMessage(message: string): Promise<string>;
  address: string;
}

/**
 * Convert Uint8Array to hex string (without 0x prefix)
 */
function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * DynamicSigner implements Linera's Signer interface using an EVM wallet
 * connected via Dynamic.xyz SDK
 * 
 * IMPORTANT: All methods must be async and match the exact signature expected by WASM
 */
export class DynamicSigner implements Signer {
  private wallet: DynamicWallet;
  private cachedAddress: string | null = null;

  constructor(wallet: DynamicWallet) {
    this.wallet = wallet;
  }

  /**
   * Get the signer's address (lowercase hex with 0x prefix)
   */
  async address(): Promise<string> {
    if (this.cachedAddress) {
      return this.cachedAddress;
    }
    
    const address = this.wallet.address;
    if (!address) {
      throw new Error('Dynamic wallet has no address');
    }
    
    this.cachedAddress = address.toLowerCase();
    return this.cachedAddress;
  }

  /**
   * Check if this signer can sign for the given owner address
   * This is called by WASM to determine which signer to use
   */
  async containsKey(owner: string): Promise<boolean> {
    const myAddress = await this.address();
    return owner.toLowerCase() === myAddress;
  }

  /**
   * Sign a message for the given owner using personal_sign
   * 
   * @param owner - The address that should sign (must match wallet address)
   * @param value - Raw bytes to sign
   * @returns Signature hex string
   */
  async sign(owner: string, value: Uint8Array): Promise<string> {
    const myAddress = await this.address();
    
    // Verify owner matches our wallet
    if (owner.toLowerCase() !== myAddress) {
      throw new Error(
        `Owner ${owner} does not match wallet address ${myAddress}`
      );
    }

    try {
      // Convert bytes to hex string with 0x prefix for personal_sign
      const messageHex = `0x${uint8ArrayToHex(value)}`;
      
      console.log('[DynamicSigner] Signing message...');
      
      // Sign using the wallet's signMessage method
      const signature = await this.wallet.signMessage(messageHex);
      
      console.log('[DynamicSigner] Message signed successfully');
      return signature;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[DynamicSigner] Signing failed:', message);
      throw new Error(`Failed to sign with Dynamic wallet: ${message}`);
    }
  }
}

/**
 * Create a DynamicSigner from a Dynamic wallet connector
 */
export function createDynamicSigner(wallet: DynamicWallet): DynamicSigner {
  return new DynamicSigner(wallet);
}
