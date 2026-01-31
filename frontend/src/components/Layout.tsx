import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Users, User, Gamepad2, LogOut, LogIn } from 'lucide-react';
import { useLineraStore } from '../stores/lineraStore';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

export default function Layout() {
  const location = useLocation();
  const { isConnected, chainId, disconnect } = useLineraStore();
  const { handleLogOut, setShowAuthFlow } = useDynamicContext();
  
  const handleDisconnect = () => {
    disconnect();
    handleLogOut();
  };
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/lobby', icon: Users, label: 'Lobby' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 panel border-b border-panel-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <Gamepad2 className="w-8 h-8 text-neon-cyan group-hover:text-glow-cyan transition-all" />
            <span className="font-display font-bold text-xl tracking-wider text-white group-hover:text-neon-cyan transition-colors">
              CHAINCYCLES
            </span>
          </Link>
          
          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    relative px-4 py-2 flex items-center gap-2 rounded-lg
                    font-mono text-sm uppercase tracking-wide
                    transition-all duration-300
                    ${isActive 
                      ? 'text-neon-cyan' 
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 border border-neon-cyan/50 rounded-lg bg-neon-cyan/10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
          
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                <span className="font-mono text-xs text-gray-400 hidden md:inline">
                  {chainId?.slice(0, 8)}...{chainId?.slice(-6)}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
                    text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30
                    hover:border-red-500/50 transition-all duration-200"
                  title="Disconnect wallet"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="font-mono text-xs text-gray-400 hidden md:inline">
                  Not connected
                </span>
                <button
                  onClick={() => setShowAuthFlow(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
                    text-neon-cyan hover:text-white hover:bg-neon-cyan/10 border border-neon-cyan/30
                    hover:border-neon-cyan/50 transition-all duration-200"
                  title="Connect wallet"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Connect</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="panel border-t border-panel-border py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-mono text-xs text-gray-500">
            Built on{' '}
            <a 
              href="https://linera.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-neon-cyan hover:underline"
            >
              Linera
            </a>
            {' '}• Cross-chain multiplayer • 100% on-chain
          </p>
        </div>
      </footer>
    </div>
  );
}
