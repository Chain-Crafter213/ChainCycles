// Connect Four Game Component
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ConnectFourBoard, Player } from '../../lib/types';
import { ConnectFourHelp } from './HelpModal';

interface ConnectFourGameProps {
  board: ConnectFourBoard;
  currentTurn: Player;
  isMyTurn: boolean;
  myPlayer: Player;
  onMove: (column: number) => void;
  disabled?: boolean;
}

export default function ConnectFourGame({
  board,
  currentTurn,
  isMyTurn,
  myPlayer,
  onMove,
  disabled = false,
}: ConnectFourGameProps) {
  const [hoverColumn, setHoverColumn] = useState<number | null>(null);

  // Check if column is full (top row occupied)
  const isColumnFull = (col: number): boolean => {
    const topRowIdx = 5 * 7 + col; // Row 5 (top), given column
    return board.cells[topRowIdx]?.player !== null;
  };

  const handleColumnClick = (col: number) => {
    if (disabled || !isMyTurn || isColumnFull(col)) return;
    onMove(col);
  };

  // Get cell player at row, col (0,0 is bottom-left)
  const getCellPlayer = (row: number, col: number): Player | null => {
    const idx = row * 7 + col;
    return board.cells[idx]?.player ?? null;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Turn indicator */}
      <div className="mb-4 text-center">
        <span className="text-gray-400">
          {isMyTurn ? "Your turn" : "Opponent's turn"}
        </span>
        <div 
          className={`w-6 h-6 rounded-full mx-auto mt-2 ${
            currentTurn === 'One' ? 'bg-red-500' : 'bg-yellow-500'
          }`}
        />
      </div>

      {/* Board */}
      <div 
        className="relative bg-blue-800 p-2 rounded-lg shadow-xl"
        style={{ width: 'fit-content' }}
      >
        {/* Column hover preview */}
        <div className="flex gap-1 mb-1">
          {[0, 1, 2, 3, 4, 5, 6].map((col) => (
            <div
              key={`preview-${col}`}
              className="w-12 h-12 flex items-center justify-center"
            >
              {hoverColumn === col && isMyTurn && !isColumnFull(col) && !disabled && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 0.5, y: 0 }}
                  className={`w-10 h-10 rounded-full ${
                    myPlayer === 'One' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((col) => (
            <div
              key={`col-${col}`}
              className={`flex flex-col-reverse gap-1 cursor-pointer ${
                !isColumnFull(col) && isMyTurn && !disabled
                  ? 'hover:bg-blue-700'
                  : ''
              }`}
              onClick={() => handleColumnClick(col)}
              onMouseEnter={() => setHoverColumn(col)}
              onMouseLeave={() => setHoverColumn(null)}
            >
              {[0, 1, 2, 3, 4, 5].map((row) => {
                const player = getCellPlayer(row, col);
                return (
                  <div
                    key={`cell-${row}-${col}`}
                    className="w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center"
                  >
                    {player && (
                      <motion.div
                        initial={{ scale: 0, y: -100 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: 'spring', damping: 15 }}
                        className={`w-10 h-10 rounded-full shadow-md ${
                          player === 'One'
                            ? 'bg-red-500 ring-2 ring-red-400'
                            : 'bg-yellow-500 ring-2 ring-yellow-400'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Move count */}
      <div className="mt-4 flex items-center gap-4 text-gray-500 text-sm">
        <span>Moves: {board.moves.length}</span>
        <span>•</span>
        <ConnectFourHelp />
      </div>
    </div>
  );
}
