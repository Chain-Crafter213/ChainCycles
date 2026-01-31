// Lobby Page - Game selection and room management
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, LogIn, Copy, Check, RefreshCw } from 'lucide-react';
import { useLineraStore } from '../stores/lineraStore';
import { useGameStore } from '../stores/gameStore';
import { getRecentRooms } from '../lib/gameApi';
import { GAME_INFO, type GameType } from '../lib/types';

const GAME_TYPES: GameType[] = ['Chess', 'ConnectFour', 'Reversi', 'Gomoku', 'Battleship', 'Mancala'];

export default function LobbyPage() {
  const navigate = useNavigate();
  const { isConnected, profile, chainId } = useLineraStore();
  const { createNewRoom, joinExistingRoom, isLoading, error, setError } = useGameStore();
  
  const [joinChainId, setJoinChainId] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  
  const recentRooms = getRecentRooms();
  
  const handleCreateRoom = async () => {
    if (!selectedGame) {
      setError('Please select a game first');
      return;
    }
    
    try {
      const hostChainId = await createNewRoom(selectedGame);
      navigate(`/room/${hostChainId}`);
    } catch {
      // Error handled in store
    }
  };
  
  const handleJoinRoom = async () => {
    if (!joinChainId.trim()) return;
    
    try {
      await joinExistingRoom(joinChainId.trim());
      navigate(`/room/${joinChainId.trim()}`);
    } catch {
      // Error handled in store
    }
  };
  
  const copyChainId = () => {
    if (chainId) {
      navigator.clipboard.writeText(chainId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };
  
  if (!isConnected) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="panel panel-glow p-8 text-center max-w-md">
          <h2 className="font-display text-2xl font-bold mb-4">Connect First</h2>
          <p className="text-gray-400 mb-6">
            You need to connect your wallet to create or join rooms.
          </p>
          <button 
            onClick={() => useLineraStore.getState().connectWithPrivateKey()}
            className="btn-neon"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-display text-4xl font-bold mb-2">
          <span className="text-white">Game</span>{' '}
          <span className="text-neon-cyan">Lobby</span>
        </h1>
        <p className="text-gray-400">Select a game and create or join a room</p>
      </motion.div>
      
      {/* Profile Card */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="panel panel-glow p-4 mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold bg-neon-cyan/20 text-neon-cyan"
            >
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-display font-bold">{profile.username}</p>
              <p className="text-sm text-gray-400">
                {profile.totalWins}W / {profile.totalLosses}L / {profile.totalDraws}D
                <span className="ml-2 text-yellow-500">{profile.xp} XP</span>
                <span className="ml-2 text-amber-400">{profile.coins} coins</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500">
              {chainId?.slice(0, 12)}...
            </span>
            <button
              onClick={copyChainId}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Copy Chain ID"
            >
              {copiedId ? (
                <Check className="w-4 h-4 text-neon-green" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300"
        >
          {error}
        </motion.div>
      )}
      
      {/* Game Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="font-display text-xl font-bold mb-4">Select a Game</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {GAME_TYPES.map((gameType) => {
            const info = GAME_INFO[gameType];
            const isSelected = selectedGame === gameType;
            
            return (
              <motion.button
                key={gameType}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedGame(gameType)}
                className={`p-4 rounded-xl border-2 transition-all
                  ${isSelected 
                    ? 'border-neon-cyan bg-neon-cyan/10 shadow-lg shadow-neon-cyan/20' 
                    : 'border-panel-border bg-panel-bg hover:border-gray-600'
                  }`}
              >
                <div className="text-4xl mb-2">{info.icon}</div>
                <div className="font-display font-bold text-sm">{info.name}</div>
                <div className="text-xs text-gray-500 mt-1">{info.players}P</div>
              </motion.button>
            );
          })}
        </div>
        
        {/* Selected game info */}
        {selectedGame && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 bg-panel-bg rounded-lg border border-panel-border"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{GAME_INFO[selectedGame].icon}</span>
              <div>
                <h3 className="font-display font-bold">{GAME_INFO[selectedGame].name}</h3>
                <p className="text-sm text-gray-400">{GAME_INFO[selectedGame].description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
      
      {/* Main Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Create Room */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="panel panel-glow p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Plus className="w-6 h-6 text-neon-cyan" />
            <h2 className="font-display text-xl font-bold">Create Room</h2>
          </div>
          
          <p className="text-gray-400 text-sm mb-4">
            Host a new game room. Share your chain ID with your opponent.
          </p>
          
          <button
            onClick={handleCreateRoom}
            disabled={isLoading || !selectedGame}
            className={`btn-neon w-full flex items-center justify-center gap-2
              ${!selectedGame ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <div className="spinner w-5 h-5" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create {selectedGame ? GAME_INFO[selectedGame].name : 'Game'} Room
              </>
            )}
          </button>
        </motion.div>
        
        {/* Join Room */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="panel panel-glow p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <LogIn className="w-6 h-6 text-neon-magenta" />
            <h2 className="font-display text-xl font-bold">Join Room</h2>
          </div>
          
          <p className="text-gray-400 text-sm mb-4">
            Enter the host's chain ID to join their game.
          </p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={joinChainId}
              onChange={(e) => setJoinChainId(e.target.value)}
              placeholder="Enter host chain ID..."
              className="input-neon flex-1"
            />
            <button
              onClick={handleJoinRoom}
              disabled={isLoading || !joinChainId.trim()}
              className="btn-neon"
            >
              {isLoading ? (
                <div className="spinner w-5 h-5" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
            </button>
          </div>
        </motion.div>
      </div>
      
      {/* Recent Rooms */}
      {recentRooms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="panel p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="w-5 h-5 text-gray-400" />
            <h2 className="font-display text-lg font-bold">Recent Rooms</h2>
          </div>
          
          <div className="space-y-2">
            {recentRooms.slice(0, 5).map((roomId) => (
              <button
                key={roomId}
                onClick={() => {
                  setJoinChainId(roomId);
                  handleJoinRoom();
                }}
                className="w-full p-3 bg-panel-bg hover:bg-white/5 rounded-lg text-left
                  font-mono text-sm text-gray-400 hover:text-white transition-colors"
              >
                {roomId.slice(0, 20)}...{roomId.slice(-8)}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
