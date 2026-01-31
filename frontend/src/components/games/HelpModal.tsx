// Help Modal Component - Shows game rules
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpModalProps {
  title: string;
  children: React.ReactNode;
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
      title="How to play"
    >
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );
}

export default function HelpModal({ title, children }: HelpModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <HelpButton onClick={() => setIsOpen(true)} />
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-cyan-400">{title}</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-gray-300 text-sm space-y-3">
                {children}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Game-specific help content
export function ChessHelp() {
  return (
    <HelpModal title="How to Play Chess">
      <p><strong className="text-white">Objective:</strong> Checkmate your opponent's King!</p>
      
      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">How to Move:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click one of your pieces to select it</li>
          <li>Click the destination square to move</li>
          <li>White (Player 1) moves first</li>
        </ol>
      </div>

      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">Piece Movements:</p>
        <ul className="space-y-1">
          <li><span className="text-2xl">♔</span> King: 1 square any direction</li>
          <li><span className="text-2xl">♕</span> Queen: Any direction, any distance</li>
          <li><span className="text-2xl">♖</span> Rook: Horizontal/vertical</li>
          <li><span className="text-2xl">♗</span> Bishop: Diagonal</li>
          <li><span className="text-2xl">♘</span> Knight: L-shape, can jump</li>
          <li><span className="text-2xl">♙</span> Pawn: Forward 1 (or 2 first move)</li>
        </ul>
      </div>

      <p><strong className="text-green-400">Win:</strong> Trap the opponent's King so it can't escape!</p>
    </HelpModal>
  );
}

export function ConnectFourHelp() {
  return (
    <HelpModal title="How to Play Connect Four">
      <p><strong className="text-white">Objective:</strong> Get 4 discs in a row!</p>
      
      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">How to Play:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click a column to drop your disc</li>
          <li>Disc falls to the lowest empty spot</li>
          <li>Take turns with your opponent</li>
        </ol>
      </div>

      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">Players:</p>
        <ul className="space-y-1">
          <li><span className="text-red-500">●</span> Player 1 = Red (moves first)</li>
          <li><span className="text-yellow-400">●</span> Player 2 = Yellow</li>
        </ul>
      </div>

      <p><strong className="text-green-400">Win:</strong> Connect 4 discs horizontally, vertically, or diagonally!</p>
    </HelpModal>
  );
}

export function ReversiHelp() {
  return (
    <HelpModal title="How to Play Reversi">
      <p><strong className="text-white">Objective:</strong> Have more discs when the game ends!</p>
      
      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">How to Play:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Place your disc to trap opponent's discs</li>
          <li>Trapped discs flip to your color</li>
          <li>You MUST flip at least one disc per move</li>
          <li>Yellow dots show valid moves</li>
        </ol>
      </div>

      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">Players:</p>
        <ul className="space-y-1">
          <li><span className="text-gray-900 bg-gray-900 rounded-full px-2">●</span> Player 1 = Black (moves first)</li>
          <li><span className="text-white bg-white rounded-full px-2">●</span> Player 2 = White</li>
        </ul>
      </div>

      <p><strong className="text-green-400">Win:</strong> Most discs when board is full or no one can move!</p>
    </HelpModal>
  );
}

export function GomokuHelp() {
  return (
    <HelpModal title="How to Play Gomoku">
      <p><strong className="text-white">Objective:</strong> Get exactly 5 stones in a row!</p>
      
      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">How to Play:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click any intersection to place your stone</li>
          <li>Stones cannot be moved once placed</li>
          <li>Take turns with your opponent</li>
        </ol>
      </div>

      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">Players:</p>
        <ul className="space-y-1">
          <li><span className="text-gray-900 bg-gray-800 rounded-full px-2 border-2 border-gray-600">●</span> Player 1 = Black (moves first)</li>
          <li><span className="text-white bg-white rounded-full px-2">●</span> Player 2 = White</li>
        </ul>
      </div>

      <p><strong className="text-green-400">Win:</strong> First to get 5 in a row (horizontal, vertical, or diagonal)!</p>
    </HelpModal>
  );
}

export function BattleshipHelp() {
  return (
    <HelpModal title="How to Play Battleship">
      <p><strong className="text-white">Objective:</strong> Sink all 5 enemy ships!</p>
      
      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">Setup Phase:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click to place each ship on your board</li>
          <li>Click "Rotate" to change orientation</li>
          <li>Place all 5 ships: Carrier(5), Battleship(4), Cruiser(3), Submarine(3), Destroyer(2)</li>
        </ol>
      </div>

      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">Battle Phase:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click on "Enemy Waters" to attack</li>
          <li><span className="text-red-500">●</span> Red = HIT (ship found!)</li>
          <li><span className="text-white/50">●</span> White = MISS (empty water)</li>
          <li>Take turns attacking</li>
        </ol>
      </div>

      <p><strong className="text-green-400">Win:</strong> Sink all 5 enemy ships before they sink yours!</p>
    </HelpModal>
  );
}

export function MancalaHelp() {
  return (
    <HelpModal title="How to Play Mancala">
      <p><strong className="text-white">Objective:</strong> Capture more stones than your opponent!</p>
      
      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">How to Play:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click a pit on YOUR side (highlighted)</li>
          <li>Stones are distributed counter-clockwise</li>
          <li>Drop 1 stone in each pit (skip opponent's store)</li>
        </ol>
      </div>

      <div className="bg-gray-700/50 p-3 rounded-lg">
        <p className="font-semibold text-white mb-2">Special Rules:</p>
        <ul className="space-y-1">
          <li><strong>Extra Turn:</strong> Last stone in YOUR store = go again!</li>
          <li><strong>Capture:</strong> Last stone in empty pit on your side = capture opposite pit!</li>
        </ul>
      </div>

      <p><strong className="text-green-400">Win:</strong> Most stones in your store when one side is empty!</p>
    </HelpModal>
  );
}
