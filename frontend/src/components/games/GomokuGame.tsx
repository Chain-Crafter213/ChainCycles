// Gomoku (Five in a Row) Game Component
import { motion } from 'framer-motion';
import type { GomokuBoard, Player } from '../../lib/types';
import { gomokuPosToRowCol } from '../../lib/types';
import { GomokuHelp } from './HelpModal';

interface GomokuGameProps {
  board: GomokuBoard;
  currentTurn?: Player; // For consistency, may be unused
  isMyTurn: boolean;
  myPlayer: Player;
  onMove: (position: number) => void;
  disabled?: boolean;
}

export default function GomokuGame({
  board,
  currentTurn: _currentTurn, // May be unused, kept for consistency
  isMyTurn,
  myPlayer,
  onMove,
  disabled = false,
}: GomokuGameProps) {
  const handleCellClick = (pos: number) => {
    if (disabled || !isMyTurn || board.cells[pos] !== 0) return;
    onMove(pos);
  };

  // Count pieces
  const p1Count = board.cells.filter((c) => c === 1).length;
  const p2Count = board.cells.filter((c) => c === 2).length;

  // Find last move for highlighting
  const lastMove = board.moves.length > 0 ? board.moves[board.moves.length - 1] : null;

  return (
    <div className="flex flex-col items-center">
      {/* Score display */}
      <div className="flex items-center justify-center gap-8 mb-4">
        <div className={`flex items-center gap-2 ${myPlayer === 'One' ? 'ring-2 ring-white rounded-lg p-2' : 'p-2'}`}>
          <div className="w-5 h-5 rounded-full bg-gray-900 ring-1 ring-gray-600" />
          <span className="font-bold text-sm">{p1Count} stones</span>
        </div>
        <span className="text-gray-500">vs</span>
        <div className={`flex items-center gap-2 ${myPlayer === 'Two' ? 'ring-2 ring-white rounded-lg p-2' : 'p-2'}`}>
          <div className="w-5 h-5 rounded-full bg-white ring-1 ring-gray-300" />
          <span className="font-bold text-sm">{p2Count} stones</span>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="mb-4 text-center">
        <span className={`text-sm ${isMyTurn ? 'text-green-400' : 'text-gray-400'}`}>
          {isMyTurn ? "Your turn - place a stone" : "Opponent's turn"}
        </span>
      </div>

      {/* Board - 15x15 Go-style with lines */}
      <div 
        className="bg-amber-600 p-2 rounded-lg shadow-xl overflow-auto"
        style={{ maxWidth: '95vw', maxHeight: '70vh' }}
      >
        <div 
          className="relative"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(15, 1fr)',
            gap: '0',
            width: 'fit-content',
          }}
        >
          {board.cells.map((cell, idx) => {
            const [row, col] = gomokuPosToRowCol(idx);
            const isLastMove = lastMove === idx;
            const isEmpty = cell === 0;
            const canClick = isMyTurn && isEmpty && !disabled;

            return (
              <div
                key={idx}
                className={`relative w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center
                  ${canClick ? 'cursor-pointer' : ''}`}
                onClick={() => handleCellClick(idx)}
              >
                {/* Grid lines */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Horizontal line */}
                  <div className={`absolute h-px bg-amber-900 ${
                    col === 0 ? 'left-1/2 right-0' : col === 14 ? 'left-0 right-1/2' : 'left-0 right-0'
                  }`} />
                  {/* Vertical line */}
                  <div className={`absolute w-px bg-amber-900 ${
                    row === 0 ? 'top-1/2 bottom-0' : row === 14 ? 'top-0 bottom-1/2' : 'top-0 bottom-0'
                  }`} />
                  {/* Star points (for traditional look) */}
                  {((row === 3 || row === 7 || row === 11) && (col === 3 || col === 7 || col === 11)) && (
                    <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-900" />
                  )}
                </div>

                {/* Stone */}
                {cell === 1 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`relative z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-900 shadow-md
                      ${isLastMove ? 'ring-2 ring-red-500' : ''}`}
                  >
                    {isLastMove && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      </div>
                    )}
                  </motion.div>
                )}
                {cell === 2 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`relative z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white shadow-md ring-1 ring-gray-300
                      ${isLastMove ? 'ring-2 ring-red-500' : ''}`}
                  >
                    {isLastMove && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Hover preview */}
                {isEmpty && canClick && (
                  <div className="absolute z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full opacity-0 hover:opacity-30
                    bg-gray-500 transition-opacity" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Move count */}
      <div className="mt-4 flex items-center gap-4 text-gray-500 text-sm">
        <span>Moves: {board.moves.length}</span>
        <span>•</span>
        <GomokuHelp />
      </div>
    </div>
  );
}
