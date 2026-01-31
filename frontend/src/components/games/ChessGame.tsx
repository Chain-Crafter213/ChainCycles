// Chess Game Component
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ChessBoard, Player } from '../../lib/types';
import { parseFenChar, squareToAlgebraic, createUciMove } from '../../lib/types';
import { ChessHelp } from './HelpModal';

interface ChessGameProps {
  board: ChessBoard;
  currentTurn: Player;
  isMyTurn: boolean;
  myPlayer: Player;
  onMove: (uciMove: string) => void;
  disabled?: boolean;
}

// Piece unicode characters
const PIECE_CHARS: Record<string, string> = {
  'k': '♔', // King
  'q': '♕', // Queen
  'r': '♖', // Rook
  'b': '♗', // Bishop
  'n': '♘', // Knight
  'p': '♙', // Pawn
};

export default function ChessGame({
  board,
  currentTurn,
  isMyTurn,
  myPlayer,
  onMove,
  disabled = false,
}: ChessGameProps) {
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [promotionSquare, setPromotionSquare] = useState<{ from: number; to: number } | null>(null);

  // Determine if we should flip the board (black plays from bottom)
  const flipBoard = myPlayer === 'Two';

  const handleSquareClick = (idx: number) => {
    if (disabled || !isMyTurn) return;

    const piece = board.board[idx];
    const pieceInfo = parseFenChar(piece);

    // If clicking on own piece, select it
    if (pieceInfo) {
      const isMyPiece = 
        (myPlayer === 'One' && pieceInfo.color === 'white') ||
        (myPlayer === 'Two' && pieceInfo.color === 'black');
      
      if (isMyPiece) {
        setSelectedSquare(idx);
        return;
      }
    }

    // If we have a selected piece, try to move
    if (selectedSquare !== null) {
      const fromPiece = board.board[selectedSquare];
      const fromInfo = parseFenChar(fromPiece);
      
      // Check for pawn promotion
      const toRow = Math.floor(idx / 8);
      const isPawn = fromInfo?.piece === 'p';
      const isPromotion = isPawn && (toRow === 0 || toRow === 7);
      
      if (isPromotion) {
        setPromotionSquare({ from: selectedSquare, to: idx });
      } else {
        const uciMove = createUciMove(selectedSquare, idx);
        onMove(uciMove);
        setSelectedSquare(null);
      }
    }
  };

  const handlePromotion = (piece: string) => {
    if (!promotionSquare) return;
    const uciMove = createUciMove(promotionSquare.from, promotionSquare.to, piece);
    onMove(uciMove);
    setPromotionSquare(null);
    setSelectedSquare(null);
  };

  const cancelPromotion = () => {
    setPromotionSquare(null);
    setSelectedSquare(null);
  };

  // Render 8x8 board
  // Contract: a8=0 (top-left for white), h1=63 (bottom-right for white)
  const renderBoard = () => {
    const squares = [];
    
    for (let displayRow = 0; displayRow < 8; displayRow++) {
      for (let displayCol = 0; displayCol < 8; displayCol++) {
        // For white (Player One): display top-to-bottom = a8 to h1
        // For black (Player Two): flip the board
        let idx: number;
        if (flipBoard) {
          // Black view: flip both row and col
          idx = (7 - displayRow) * 8 + (7 - displayCol);
        } else {
          // White view: direct mapping
          idx = displayRow * 8 + displayCol;
        }
        
        // For checkerboard pattern, use display coordinates
        const isLight = (displayRow + displayCol) % 2 === 0;
        const piece = board.board[idx];
        const pieceInfo = parseFenChar(piece);
        
        const isSelected = selectedSquare === idx;
        const lastMove = board.moves.length > 0 ? board.moves[board.moves.length - 1] : null;
        const isLastMoveSquare = lastMove && (
          lastMove.slice(0, 2) === squareToAlgebraic(idx) ||
          lastMove.slice(2, 4) === squareToAlgebraic(idx)
        );
        
        squares.push(
          <div
            key={idx}
            onClick={() => handleSquareClick(idx)}
            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center relative cursor-pointer
              ${isLight ? 'bg-amber-200' : 'bg-amber-700'}
              ${isSelected ? 'ring-4 ring-yellow-400' : ''}
              ${isLastMoveSquare ? 'bg-opacity-70 ring-2 ring-blue-400' : ''}
              transition-all`}
          >
            {pieceInfo && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-3xl sm:text-4xl select-none
                  ${pieceInfo.color === 'white' ? 'text-gray-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900'}`}
              >
                {PIECE_CHARS[pieceInfo.piece]}
              </motion.span>
            )}
            
            {/* Rank/File labels */}
            {displayCol === 0 && (
              <span className="absolute left-0.5 top-0.5 text-xs opacity-50">
                {flipBoard ? displayRow + 1 : 8 - displayRow}
              </span>
            )}
            {displayRow === 7 && (
              <span className="absolute right-0.5 bottom-0.5 text-xs opacity-50">
                {String.fromCharCode(97 + (flipBoard ? 7 - displayCol : displayCol))}
              </span>
            )}
          </div>
        );
      }
    }
    
    return squares;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Turn indicator */}
      <div className="mb-4 text-center">
        <span className={`text-sm ${isMyTurn ? 'text-green-400' : 'text-gray-400'}`}>
          {isMyTurn ? "Your turn" : "Opponent's turn"}
        </span>
        <span className="ml-2 text-gray-500">
          ({currentTurn === 'One' ? 'White' : 'Black'} to move)
        </span>
      </div>

      {/* Board */}
      <div className="relative bg-amber-900 p-2 rounded-lg shadow-xl">
        <div className="grid grid-cols-8">
          {renderBoard()}
        </div>
        
        {/* Promotion dialog */}
        {promotionSquare && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg"
          >
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-center mb-4 text-white">Promote to:</p>
              <div className="flex gap-2">
                {['q', 'r', 'b', 'n'].map((piece) => (
                  <button
                    key={piece}
                    onClick={() => handlePromotion(piece)}
                    className="w-14 h-14 bg-amber-200 hover:bg-amber-300 rounded-lg flex items-center justify-center text-4xl transition-colors"
                  >
                    {PIECE_CHARS[piece]}
                  </button>
                ))}
              </div>
              <button
                onClick={cancelPromotion}
                className="mt-4 w-full py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Game info */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <span>Move {board.fullmove}</span>
        <span>•</span>
        <span>You play {myPlayer === 'One' ? 'White' : 'Black'}</span>
        <span>•</span>
        <ChessHelp />
      </div>

      {/* Move history (last few moves) */}
      {board.moves.length > 0 && (
        <div className="mt-2 text-xs text-gray-600 max-w-xs overflow-x-auto">
          <span className="text-gray-400">History: </span>
          {board.moves.slice(-10).join(' ')}
        </div>
      )}
    </div>
  );
}
