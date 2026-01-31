// Mancala Game Component
import { motion } from 'framer-motion';
import type { MancalaBoard, Player } from '../../lib/types';
import { getMancalaPlayerPits, getMancalaStore } from '../../lib/types';
import { MancalaHelp } from './HelpModal';

interface MancalaGameProps {
  board: MancalaBoard;
  currentTurn?: Player; // For consistency, may be unused
  isMyTurn: boolean;
  myPlayer: Player;
  onMove: (pitIndex: number) => void;
  disabled?: boolean;
}

export default function MancalaGame({
  board,
  currentTurn: _currentTurn, // May be unused, kept for consistency
  isMyTurn,
  myPlayer,
  onMove,
  disabled = false,
}: MancalaGameProps) {
  const p1Pits = getMancalaPlayerPits(board, 'One');
  const p2Pits = getMancalaPlayerPits(board, 'Two');
  const p1Store = getMancalaStore(board, 'One');
  const p2Store = getMancalaStore(board, 'Two');

  // Player 1's pits are at bottom (left to right: 0-5)
  // Player 2's pits are at top (right to left: 5-0)
  const isP1 = myPlayer === 'One';
  const myPits = isP1 ? p1Pits : p2Pits;
  const oppPits = isP1 ? p2Pits : p1Pits;

  const handlePitClick = (pitIdx: number) => {
    if (disabled || !isMyTurn) return;
    // Only can move from pits with seeds
    if (myPits[pitIdx] === 0) return;
    onMove(pitIdx);
  };

  // Render seeds as dots
  const renderSeeds = (count: number, maxShow: number = 12) => {
    const showCount = Math.min(count, maxShow);
    const remaining = count - showCount;
    
    return (
      <div className="flex flex-wrap justify-center gap-0.5 max-w-full">
        {Array.from({ length: showCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className="w-2 h-2 rounded-full bg-amber-200"
          />
        ))}
        {remaining > 0 && (
          <span className="text-xs text-amber-200">+{remaining}</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      {/* Turn indicator */}
      <div className="mb-4 text-center">
        <span className={`text-sm ${isMyTurn ? 'text-green-400' : 'text-gray-400'}`}>
          {isMyTurn ? "Your turn - pick a pit" : "Opponent's turn"}
        </span>
      </div>

      {/* Mancala Board */}
      <div className="bg-amber-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          {/* Left store (P2's store if you're P1, P1's store if you're P2) */}
          <div className={`w-16 h-32 bg-amber-900 rounded-full flex flex-col items-center justify-center
            ${!isP1 ? 'ring-2 ring-white' : ''}`}>
            <span className="text-lg font-bold text-white">{isP1 ? p2Store : p1Store}</span>
            <span className="text-xs text-amber-300">{isP1 ? 'Opp' : 'You'}</span>
            <div className="mt-1">
              {renderSeeds(isP1 ? p2Store : p1Store, 8)}
            </div>
          </div>

          {/* Central pits */}
          <div className="flex flex-col gap-2">
            {/* Top row (opponent's pits, reversed) */}
            <div className="flex gap-2">
              {[...oppPits].reverse().map((seeds, displayIdx) => {
                const actualIdx = 5 - displayIdx; // Reverse for display
                return (
                  <div
                    key={`opp-${actualIdx}`}
                    className="w-12 h-12 bg-amber-900 rounded-full flex flex-col items-center justify-center"
                  >
                    <span className="text-sm font-bold text-amber-100">{seeds}</span>
                    <div className="h-4 overflow-hidden">
                      {renderSeeds(seeds, 4)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom row (your pits) */}
            <div className="flex gap-2">
              {myPits.map((seeds, idx) => {
                const canClick = isMyTurn && seeds > 0 && !disabled;
                return (
                  <motion.div
                    key={`my-${idx}`}
                    whileHover={canClick ? { scale: 1.1 } : {}}
                    whileTap={canClick ? { scale: 0.95 } : {}}
                    onClick={() => handlePitClick(idx)}
                    className={`w-12 h-12 bg-amber-900 rounded-full flex flex-col items-center justify-center
                      ${canClick ? 'cursor-pointer hover:bg-amber-700 ring-2 ring-amber-400' : ''}
                      ${seeds === 0 ? 'opacity-50' : ''}`}
                  >
                    <span className="text-sm font-bold text-amber-100">{seeds}</span>
                    <div className="h-4 overflow-hidden">
                      {renderSeeds(seeds, 4)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right store (P1's store if you're P1, P2's store if you're P2) */}
          <div className={`w-16 h-32 bg-amber-900 rounded-full flex flex-col items-center justify-center
            ${isP1 ? 'ring-2 ring-white' : ''}`}>
            <span className="text-lg font-bold text-white">{isP1 ? p1Store : p2Store}</span>
            <span className="text-xs text-amber-300">{isP1 ? 'You' : 'Opp'}</span>
            <div className="mt-1">
              {renderSeeds(isP1 ? p1Store : p2Store, 8)}
            </div>
          </div>
        </div>
      </div>

      {/* Score summary */}
      <div className="mt-4 flex gap-8 text-sm">
        <div className={`${myPlayer === 'One' ? 'text-green-400' : 'text-gray-400'}`}>
          P1: {p1Store} in store
        </div>
        <div className={`${myPlayer === 'Two' ? 'text-green-400' : 'text-gray-400'}`}>
          P2: {p2Store} in store
        </div>
      </div>

      {/* Move count */}
      <div className="mt-2 flex items-center gap-4 text-gray-500 text-sm">
        <span>Moves: {board.moves.length}</span>
        <span>•</span>
        <MancalaHelp />
      </div>
    </div>
  );
}
