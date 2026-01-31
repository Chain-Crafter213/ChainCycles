// WalletConnect Component - Handles wallet connection with Dynamic.xyz
// Provides both MetaMask and standalone (no wallet) connection options

import { useState, useEffect } from 'react';
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { useLineraStore } from '../stores/lineraStore';
import type { DynamicWallet } from '../lib/linera';

export function WalletConnect() {
  const { primaryWallet, setShowAuthFlow, handleLogOut } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const { 
    isConnecting, 
    isConnected, 
    error, 
    userAddress,
    chainId,
    connectWithWallet, 
    connectWithPrivateKey,
    disconnect 
  } = useLineraStore();
  
  const [isConnectingLinera, setIsConnectingLinera] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Auto-connect to Linera when wallet is connected
  useEffect(() => {
    if (isLoggedIn && primaryWallet && !isConnected && !isConnecting && !isConnectingLinera) {
      handleConnectLinera();
    }
  }, [isLoggedIn, primaryWallet, isConnected, isConnecting]);

  // Connect to Linera after wallet is connected
  const handleConnectLinera = async () => {
    if (!primaryWallet) return;
    
    setIsConnectingLinera(true);
    setLocalError(null);
    console.log('[WalletConnect] Starting Linera connection with wallet:', primaryWallet.address);
    
    try {
      // Create DynamicWallet adapter from primary wallet
      const dynamicWallet: DynamicWallet = {
        address: primaryWallet.address,
        signMessage: async (message: string) => {
          console.log('[WalletConnect] Signing message...');
          const signature = await primaryWallet.signMessage(message);
          return signature || '';
        },
      };
      
      await connectWithWallet(dynamicWallet);
      console.log('[WalletConnect] Linera connection successful!');
    } catch (err) {
      console.error('[WalletConnect] Failed to connect to Linera:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnectingLinera(false);
    }
  };

  // Connect without wallet (standalone mode)
  const handleConnectStandalone = async () => {
    setIsConnectingLinera(true);
    setLocalError(null);
    console.log('[WalletConnect] Starting standalone Linera connection...');
    
    try {
      await connectWithPrivateKey();
      console.log('[WalletConnect] Standalone connection successful!');
    } catch (err) {
      console.error('[WalletConnect] Failed to connect:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnectingLinera(false);
    }
  };

  // Full disconnect (both Linera and Dynamic wallet)
  const handleFullDisconnect = () => {
    disconnect();
    handleLogOut();
  };

  const displayError = localError || error;

  // If connected to Linera, show connection info
  if (isConnected && chainId) {
    return (
      <div className="wallet-connect connected">
        <div className="connection-info">
          <div className="status-indicator connected" />
          <span className="status-text">Connected to Linera</span>
        </div>
        <div className="address-info">
          <span className="label">Chain:</span>
          <span className="value">{chainId.slice(0, 8)}...{chainId.slice(-4)}</span>
        </div>
        {userAddress && (
          <div className="address-info">
            <span className="label">Address:</span>
            <span className="value">{userAddress.slice(0, 8)}...{userAddress.slice(-4)}</span>
          </div>
        )}
        <button 
          onClick={handleFullDisconnect}
          className="btn-disconnect"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // If wallet is connected via Dynamic but not yet connected to Linera
  if (isLoggedIn && primaryWallet) {
    return (
      <div className="wallet-connect pending-linera">
        <div className="connection-info">
          <div className="status-indicator wallet-connected" />
          <span className="status-text">Wallet: {primaryWallet.address.slice(0, 6)}...</span>
        </div>
        <button
          onClick={handleConnectLinera}
          disabled={isConnectingLinera || isConnecting}
          className="btn-connect-linera"
        >
          {isConnectingLinera || isConnecting ? (
            <>
              <span className="spinner" /> Claiming Chain...
            </>
          ) : (
            'Connect to Linera & Claim Chain'
          )}
        </button>
        {displayError && <div className="error-message">{displayError}</div>}
      </div>
    );
  }

  // Not connected - show connection options
  return (
    <div className="wallet-connect not-connected">
      <h3 className="connect-title">Connect to Play</h3>
      
      <button
        onClick={() => setShowAuthFlow(true)}
        className="btn-connect-wallet"
      >
        <svg className="wallet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
          <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </svg>
        Connect Wallet (MetaMask)
      </button>
      
      <div className="divider">
        <span>or</span>
      </div>
      
      <button
        onClick={handleConnectStandalone}
        disabled={isConnectingLinera || isConnecting}
        className="btn-connect-standalone"
      >
        {isConnectingLinera || isConnecting ? (
          <>
            <span className="spinner" /> Connecting...
          </>
        ) : (
          'Play without Wallet (Quick Start)'
        )}
      </button>
      
      <p className="connect-note">
        Connect a wallet for persistent progress, or play instantly without one.
      </p>
      
      {displayError && <div className="error-message">{displayError}</div>}
    </div>
  );
}

// Styles
const styles = `
.wallet-connect {
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid var(--neon-cyan, #00ffff);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  min-width: 280px;
}

.wallet-connect.connected {
  border-color: var(--neon-green, #00ff88);
}

.connect-title {
  font-family: 'Orbitron', monospace;
  color: var(--neon-cyan, #00ffff);
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.connection-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--neon-red, #ff0044);
}

.status-indicator.connected {
  background: var(--neon-green, #00ff88);
  box-shadow: 0 0 10px var(--neon-green, #00ff88);
}

.status-indicator.wallet-connected {
  background: var(--neon-yellow, #ffff00);
  box-shadow: 0 0 10px var(--neon-yellow, #ffff00);
}

.address-info {
  font-size: 0.85rem;
  margin: 0.25rem 0;
}

.address-info .label {
  color: var(--neon-cyan, #00ffff);
  margin-right: 0.5rem;
}

.address-info .value {
  font-family: monospace;
  color: white;
}

.btn-connect-wallet,
.btn-connect-linera,
.btn-connect-standalone,
.btn-disconnect {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-family: 'Orbitron', monospace;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.btn-connect-wallet {
  background: linear-gradient(135deg, var(--neon-cyan, #00ffff), var(--neon-blue, #0088ff));
  border: none;
  color: black;
}

.btn-connect-wallet:hover {
  box-shadow: 0 0 20px var(--neon-cyan, #00ffff);
  transform: translateY(-2px);
}

.btn-connect-linera {
  background: linear-gradient(135deg, var(--neon-green, #00ff88), #00aa00);
  border: none;
  color: black;
}

.btn-connect-linera:hover:not(:disabled) {
  box-shadow: 0 0 20px var(--neon-green, #00ff88);
}

.btn-connect-standalone {
  background: transparent;
  border: 1px solid var(--neon-purple, #8800ff);
  color: var(--neon-purple, #8800ff);
}

.btn-connect-standalone:hover:not(:disabled) {
  background: var(--neon-purple, #8800ff);
  color: black;
}

.btn-disconnect {
  background: transparent;
  border: 1px solid var(--neon-red, #ff0044);
  color: var(--neon-red, #ff0044);
}

.btn-disconnect:hover {
  background: var(--neon-red, #ff0044);
  color: black;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wallet-icon {
  width: 20px;
  height: 20px;
}

.divider {
  display: flex;
  align-items: center;
  margin: 1rem 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.divider span {
  padding: 0 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
}

.connect-note {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 1rem;
}

.error-message {
  color: var(--neon-red, #ff0044);
  font-size: 0.85rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 4px;
  word-break: break-word;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('wallet-connect-styles');
  if (!existingStyle) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'wallet-connect-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}

export default WalletConnect;
