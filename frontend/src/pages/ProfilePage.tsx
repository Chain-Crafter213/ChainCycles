// Profile Page - User profile and stats
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Trophy, Gamepad2, Check, AlertCircle, Wallet, Coins, Star } from 'lucide-react';
import { useLineraStore } from '../stores/lineraStore';
import { updateProfile } from '../lib/gameApi';

export default function ProfilePage() {
  const { chainId, userAddress, profile, isConnecting } = useLineraStore();
  
  const [username, setUsername] = useState(profile?.username || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
    }
  }, [profile]);
  
  const handleSave = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (username.length < 3 || username.length > 16) {
      setError('Username must be 3-16 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('Username can only contain letters, numbers, _ and -');
      return;
    }
    
    setError(null);
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await updateProfile(username);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Stats
  const stats = {
    gamesPlayed: profile?.totalGames || 0,
    wins: profile?.totalWins || 0,
    losses: profile?.totalLosses || 0,
    draws: profile?.totalDraws || 0,
    winRate: profile?.totalGames 
      ? Math.round((profile.totalWins / profile.totalGames) * 100) 
      : 0,
    xp: profile?.xp || 0,
    coins: profile?.coins || 0,
  };
  
  if (isConnecting) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  if (!chainId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="panel panel-glow p-8 text-center max-w-md">
          <Wallet className="w-12 h-12 text-neon-cyan mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Connect Wallet</h2>
          <p className="text-gray-400 mb-4">
            Connect your wallet to view and edit your profile.
          </p>
          <button
            onClick={() => useLineraStore.getState().connectWithPrivateKey()}
            className="btn-neon"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-display text-3xl font-bold text-glow-cyan mb-2">
          Your Profile
        </h1>
        <p className="text-gray-400">
          View your stats and customize your profile
        </p>
      </motion.div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="panel panel-glow p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-neon-cyan" />
            <h2 className="font-display text-xl font-bold">Settings</h2>
          </div>
          
          {/* Wallet Address */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">
              Wallet Address
            </label>
            <div className="font-mono text-sm bg-panel-bg border border-panel-border rounded px-3 py-2 truncate">
              {userAddress || 'Not connected'}
            </div>
          </div>
          
          {/* Chain ID */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">
              Chain ID
            </label>
            <div className="font-mono text-xs bg-panel-bg border border-panel-border rounded px-3 py-2 truncate">
              {chainId}
            </div>
          </div>
          
          {/* Username */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              maxLength={16}
              className="input-neon w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              3-16 characters, letters, numbers, _ and - only
            </p>
          </div>
          
          {/* Preview */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">
              Preview
            </label>
            <div className="bg-panel-bg border border-panel-border rounded-lg p-4 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-neon-cyan/20 text-neon-cyan"
              >
                {(username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-neon-cyan">
                  {username || 'Username'}
                </p>
                <p className="text-xs text-gray-500">Your in-game name</p>
              </div>
            </div>
          </div>
          
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`
              btn-neon w-full flex items-center justify-center gap-2
              ${saveSuccess ? 'bg-neon-green/20 border-neon-green text-neon-green' : ''}
            `}
          >
            {isSaving ? (
              <>
                <div className="spinner w-4 h-4" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </motion.div>
        
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* XP and Coins */}
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400" />
              <h2 className="font-display text-xl font-bold">Rewards</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-panel-bg rounded-lg p-4 text-center">
                <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-400">{stats.xp}</p>
                <p className="text-sm text-gray-400">XP</p>
              </div>
              <div className="bg-panel-bg rounded-lg p-4 text-center">
                <Coins className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-400">{stats.coins}</p>
                <p className="text-sm text-gray-400">Coins</p>
              </div>
            </div>
          </div>
          
          {/* Win Rate Card */}
          <div className="panel panel-glow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-neon-magenta" />
              <h2 className="font-display text-xl font-bold">Statistics</h2>
            </div>
            
            {/* Win Rate Circle */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#1a1a2e"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#00ffff"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${stats.winRate * 3.52} 352`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{stats.winRate}%</span>
                </div>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-neon-green">{stats.wins}</p>
                <p className="text-sm text-gray-400">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{stats.losses}</p>
                <p className="text-sm text-gray-400">Losses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{stats.draws}</p>
                <p className="text-sm text-gray-400">Draws</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neon-cyan">{stats.gamesPlayed}</p>
                <p className="text-sm text-gray-400">Total Games</p>
              </div>
            </div>
          </div>
          
          {/* Games Played */}
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gamepad2 className="w-5 h-5 text-neon-cyan" />
              <h2 className="font-display text-xl font-bold">Available Games</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {['♟️ Chess', '🔴 Connect4', '⚫ Reversi', '⚪ Gomoku', '🚢 Battleship', '🕳️ Mancala'].map((game) => (
                <div key={game} className="bg-panel-bg rounded-lg p-2 text-center text-sm">
                  {game}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
