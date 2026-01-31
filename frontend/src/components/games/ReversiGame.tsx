// Reversi (Othello) Game Component
import { motion } from 'framer-motion';
import type { ReversiBoard, Player } from '../../lib/types';
import { ReversiHelp } from './HelpModal';

interface ReversiGameProps {
  board: ReversiBoard;
  currentTurn?: Player; // For consistency, may be unused
  isMyTurn: boolean;
  myPlayer: Player;
  validMoves: number[];
  onMove: (position: number) => void;
  onPass: () => void;
  disabled?: boolean;
}

export default function ReversiGame({
  board,
  currentTurn: _currentTurn, // May be unused, kept for consistency
  isMyTurn,
  myPlayer,
  validMoves,
  onMove,
  onPass,
  disabled = false,
}: ReversiGameProps) {
  const handleCellClick = (pos: number) => {
    if (disabled || !isMyTurn || !validMoves.includes(pos)) return;
    onMove(pos);
  };

  const handlePass = () => {
    if (disabled || !isMyTurn || validMoves.length > 0) return;
    onPass();
  };

  // Count pieces
  const p1Count = board.cells.filter((c) => c === 1).length;
  const p2Count = board.cells.filter((c) => c === 2).length;

  return (
    <div className="flex flex-col items-center">
      {/* Score display */}
      <div className="flex items-center justify-center gap-8 mb-4">
        <div className={`flex items-center gap-2 ${myPlayer === 'One' ? 'ring-2 ring-white rounded-lg p-2' : 'p-2'}`}>
          <div className="w-6 h-6 rounded-full bg-gray-900 ring-2 ring-gray-600" />
          <span className="font-bold">{p1Count}</span>
        </div>
        <span className="text-gray-500">vs</span>
        <div className={`flex items-center gap-2 ${myPlayer === 'Two' ? 'ring-2 ring-white rounded-lg p-2' : 'p-2'}`}>
          <div className="w-6 h-6 rounded-full bg-white ring-2 ring-gray-300" />
          <span className="font-bold">{p2Count}</span>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="mb-4 text-center">
        <span className={`text-sm ${isMyTurn ? 'text-green-400' : 'text-gray-400'}`}>
          {isMyTurn ? "Your turn" : "Opponent's turn"}
        </span>
      </div>

      {/* Board */}
      <div className="bg-green-700 p-2 rounded-lg shadow-xl">
        <div className="grid grid-cols-8 gap-0.5">
          {board.cells.map((cell, idx) => {
            const isValidMove = validMoves.includes(idx);
            const canClick = isMyTurn && isValidMove && !disabled;

            return (
              <div
                key={idx}
                className={`w-10 h-10 sm:w-12 sm:h-12 bg-green-600 flex items-center justify-center rounded-sm
                  ${canClick ? 'cursor-pointer hover:bg-green-500' : ''}
                  ${isValidMove && isMyTurn ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}`}
                onClick={() => handleCellClick(idx)}
              >
                {cell === 1 && (
                  <motion.div
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900 shadow-md ring-2 ring-gray-700"
                  />
                )}
                {cell === 2 && (
                  <motion.div
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-md ring-2 ring-gray-300"
                  />
                )}
                {cell === 0 && isValidMove && isMyTurn && !disabled && (
                  <div className="w-4 h-4 rounded-full bg-yellow-400/30" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pass button - only shown when no valid moves */}
      {isMyTurn && validMoves.length === 0 && !disabled && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handlePass}
          className="mt-4 px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold transition-colors"
        >
          Pass Turn
        </motion.button>
      )}

      {/* Move count */}
      <div className="mt-4 flex items-center gap-4 text-gray-500 text-sm">
        <span>Moves: {board.moves.length}</span>
        <span>•</span>
        <ReversiHelp />
      </div>
    </div>
  );
}
