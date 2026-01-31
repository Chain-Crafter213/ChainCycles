// Game Page - Renders the appropriate game based on room type
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, LogOut, Users, Trophy } from 'lucide-react';
import { useLineraStore } from '../stores/lineraStore';
import { useGameStore } from '../stores/gameStore';
import { GAME_INFO, type Player, type MoveData } from '../lib/types';
import { getReversiValidMoves } from '../lib/gameApi';
import {
  ChessGame,
  ConnectFourGame,
  ReversiGame,
  GomokuGame,
  BattleshipGame,
  MancalaGame,
} from '../components/games';

export default function GamePage() {
  const { hostChainId } = useParams<{ hostChainId: string }>();
  const navigate = useNavigate();
  
  const { chainId } = useLineraStore();
  const { 
    room, 
    isLoading,
    error,
    joinExistingRoom,
    leaveCurrentRoom,
    submitMove,
    startPolling,
    stopPolling,
    syncRoom,
  } = useGameStore();
  
  const [copied, setCopied] = useState(false);
  const [reversiValidMoves, setReversiValidMoves] = useState<number[]>([]);
  
  // Determine player info
  const playerIndex = room?.playerChainIds.indexOf(chainId || '') ?? -1;
  const isPlayer = playerIndex !== -1;
  const myPlayer: Player = playerIndex === 0 ? 'One' : 'Two';
  const isMyTurn = room?.status === 'InProgress' && room.currentTurn === myPlayer;
  const isHost = room?.hostChainId === chainId;
  
  // Join room if not already in one
  useEffect(() => {
    if (!hostChainId || !chainId) return;
    
    let mounted = true;
    
    const init = async () => {
      try {
        if (!room) {
          if (hostChainId === chainId) {
            // We're the host, just sync
            await syncRoom();
          } else {
            // We need to join
            await joinExistingRoom(hostChainId);
          }
        }
        
        // Start polling for updates
        if (mounted) {
          startPolling();
        }
      } catch (err) {
        console.error('Failed to initialize game room:', err);
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      stopPolling();
    };
  }, [hostChainId, chainId]);
  
  // Fetch Reversi valid moves when it's our turn
  useEffect(() => {
    if (room?.gameType === 'Reversi' && isMyTurn && room.status === 'InProgress') {
      getReversiValidMoves().then(setReversiValidMoves);
    }
  }, [room?.gameType, isMyTurn, room?.status, room?.reversiBoard?.moves.length]);
  
  const copyRoomId = () => {
    if (hostChainId) {
      navigator.clipboard.writeText(hostChainId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleLeave = async () => {
    await leaveCurrentRoom();
    navigate('/lobby');
  };
  
  // Handle move submission based on game type
  const handleMove = async (moveData: MoveData) => {
    try {
      await submitMove(moveData);
    } catch (err) {
      console.error('Move failed:', err);
    }
  };
  
  // Render the appropriate game board
  const renderGame = () => {
    if (!room || !isPlayer) return null;
    
    switch (room.gameType) {
      case 'Chess':
        if (!room.chessBoard) return null;
        return (
          <ChessGame
            board={room.chessBoard}
            currentTurn={room.currentTurn}
            isMyTurn={isMyTurn}
            myPlayer={myPlayer}
            onMove={(uciMove) => handleMove({ primary: 0, secondary: uciMove })}
            disabled={isLoading}
          />
        );
        
      case 'ConnectFour':
        if (!room.connectFourBoard) return null;
        return (
          <ConnectFourGame
            board={room.connectFourBoard}
            currentTurn={room.currentTurn}
            isMyTurn={isMyTurn}
            myPlayer={myPlayer}
            onMove={(col) => handleMove({ primary: col })}
            disabled={isLoading}
          />
        );
        
      case 'Reversi':
        if (!room.reversiBoard) return null;
        return (
          <ReversiGame
            board={room.reversiBoard}
            currentTurn={room.currentTurn}
            isMyTurn={isMyTurn}
            myPlayer={myPlayer}
            validMoves={reversiValidMoves}
            onMove={(pos) => handleMove({ primary: pos })}
            onPass={() => handleMove({ primary: -1 })}
            disabled={isLoading}
          />
        );
        
      case 'Gomoku':
        if (!room.gomokuBoard) return null;
        return (
          <GomokuGame
            board={room.gomokuBoard}
            currentTurn={room.currentTurn}
            isMyTurn={isMyTurn}
            myPlayer={myPlayer}
            onMove={(pos) => handleMove({ primary: pos })}
            disabled={isLoading}
          />
        );
        
      case 'Battleship':
        if (!room.battleshipBoard) return null;
        return (
          <BattleshipGame
            board={room.battleshipBoard}
            currentTurn={room.currentTurn}
            isMyTurn={isMyTurn}
            myPlayer={myPlayer}
            onAttack={(pos) => handleMove({ primary: pos })}
            onPlaceShips={(data) => handleMove({ primary: 0, secondary: data })}
            disabled={isLoading}
          />
        );
        
      case 'Mancala':
        if (!room.mancalaBoard) return null;
        return (
          <MancalaGame
            board={room.mancalaBoard}
            currentTurn={room.currentTurn}
            isMyTurn={isMyTurn}
            myPlayer={myPlayer}
            onMove={(pit) => handleMove({ primary: pit })}
            disabled={isLoading}
          />
        );
        
      default:
        return <div>Unknown game type</div>;
    }
  };
  
  // Loading state
  if (!room) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-400">Loading game room...</p>
        </div>
      </div>
    );
  }
  
  const gameInfo = GAME_INFO[room.gameType];
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{gameInfo.icon}</span>
          <div>
            <h1 className="font-display text-2xl font-bold">{gameInfo.name}</h1>
            <p className="text-sm text-gray-400">
              {isHost ? 'Hosting' : 'Playing'} • 
              {room.status === 'WaitingForPlayer' && ' Waiting for opponent...'}
              {room.status === 'InProgress' && ` ${isMyTurn ? 'Your turn' : "Opponent's turn"}`}
              {room.status === 'Finished' && ' Game over'}
              {room.status === 'Draw' && ' Draw'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomId}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Copy room ID"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5 text-gray-400" />
            )}
          </button>
          <button
            onClick={handleLeave}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
            title="Leave room"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
      
      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm"
        >
          {error}
        </motion.div>
      )}
      
      {/* Players info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="panel p-4 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Players:</span>
          </div>
          <div className="flex gap-4">
            {room.usernames.map((username, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg
                  ${idx === playerIndex ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-panel-bg text-gray-400'}
                  ${room.currentTurn === (idx === 0 ? 'One' : 'Two') ? 'ring-2 ring-white' : ''}`}
              >
                <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <span className="font-display text-sm">{username || `Player ${idx + 1}`}</span>
                {room.winner === (idx === 0 ? 'One' : 'Two') && (
                  <Trophy className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      
      {/* Waiting for player */}
      {room.status === 'WaitingForPlayer' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="panel panel-glow p-8 text-center mb-6"
        >
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Waiting for Opponent</h2>
          <p className="text-gray-400 mb-4">Share your room ID with a friend:</p>
          <div className="flex items-center justify-center gap-2">
            <code className="font-mono text-sm bg-black/30 px-3 py-2 rounded-lg text-neon-cyan">
              {hostChainId?.slice(0, 20)}...{hostChainId?.slice(-8)}
            </code>
            <button
              onClick={copyRoomId}
              className="p-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4 text-neon-cyan" />
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Game board */}
      {(room.status === 'InProgress' || room.status === 'Finished' || room.status === 'Draw') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-6"
        >
          {renderGame()}
        </motion.div>
      )}
      
      {/* Game over overlay */}
      <AnimatePresence>
        {(room.status === 'Finished' || room.status === 'Draw') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => {}}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="panel panel-glow p-8 text-center max-w-md"
            >
              {room.status === 'Draw' ? (
                <>
                  <div className="text-6xl mb-4">🤝</div>
                  <h2 className="font-display text-3xl font-bold mb-2">Draw!</h2>
                  <p className="text-gray-400">Well played by both sides.</p>
                </>
              ) : room.winner === myPlayer ? (
                <>
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="font-display text-3xl font-bold text-neon-green mb-2">Victory!</h2>
                  <p className="text-gray-400">Congratulations, you won!</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">😔</div>
                  <h2 className="font-display text-3xl font-bold text-red-400 mb-2">Defeat</h2>
                  <p className="text-gray-400">Better luck next time!</p>
                </>
              )}
              
              <div className="flex gap-4 mt-6 justify-center">
                <button
                  onClick={() => navigate('/lobby')}
                  className="btn-neon"
                >
                  Back to Lobby
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
