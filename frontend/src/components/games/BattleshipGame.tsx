// Battleship Game Component
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { BattleshipBoard, Player } from '../../lib/types';
import { 
  battleshipPosToRowCol, 
  battleshipRowColToPos,
  BATTLESHIP_SHIPS,
} from '../../lib/types';
import { BattleshipHelp } from './HelpModal';

interface BattleshipGameProps {
  board: BattleshipBoard;
  currentTurn?: Player; // For consistency, may be unused
  isMyTurn: boolean;
  myPlayer: Player;
  onAttack: (position: number) => void;
  onPlaceShips: (shipData: string) => void;
  disabled?: boolean;
}

interface ShipPlacement {
  shipIndex: number;
  startPos: number;
  horizontal: boolean;
}

export default function BattleshipGame({
  board,
  currentTurn: _currentTurn, // May be unused, kept for consistency
  isMyTurn,
  myPlayer,
  onAttack,
  onPlaceShips,
  disabled = false,
}: BattleshipGameProps) {
  const [shipPlacements, setShipPlacements] = useState<ShipPlacement[]>([]);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [hoverPos, setHoverPos] = useState<number | null>(null);

  const isP1 = myPlayer === 'One';
  const myShips = isP1 ? board.p1Ships : board.p2Ships;
  const oppShips = isP1 ? board.p2Ships : board.p1Ships;
  const myHits = isP1 ? board.p1Hits : board.p2Hits;
  const oppHits = isP1 ? board.p2Hits : board.p1Hits;
  const amIReady = isP1 ? board.p1Ready : board.p2Ready;

  // Setup phase logic
  const inSetupPhase = board.setupPhase;

  // Check if ship placement is valid
  const isValidPlacement = (shipIdx: number, startPos: number, horizontal: boolean): boolean => {
    const ship = BATTLESHIP_SHIPS[shipIdx];
    const [startRow, startCol] = battleshipPosToRowCol(startPos);
    
    for (let i = 0; i < ship.size; i++) {
      const row = horizontal ? startRow : startRow + i;
      const col = horizontal ? startCol + i : startCol;
      
      if (row > 9 || col > 9) return false;
      
      const pos = battleshipRowColToPos(row, col);
      
      // Check if cell is already occupied by placed ships
      const isOccupied = shipPlacements.some((p) => {
        const placedShip = BATTLESHIP_SHIPS[p.shipIndex];
        const [pRow, pCol] = battleshipPosToRowCol(p.startPos);
        
        for (let j = 0; j < placedShip.size; j++) {
          const pr = p.horizontal ? pRow : pRow + j;
          const pc = p.horizontal ? pCol + j : pCol;
          if (battleshipRowColToPos(pr, pc) === pos) return true;
        }
        return false;
      });
      
      if (isOccupied) return false;
    }
    
    return true;
  };

  // Get cells that would be occupied by current placement
  const getShipCells = (shipIdx: number, startPos: number, horizontal: boolean): number[] => {
    const ship = BATTLESHIP_SHIPS[shipIdx];
    const [startRow, startCol] = battleshipPosToRowCol(startPos);
    const cells: number[] = [];
    
    for (let i = 0; i < ship.size; i++) {
      const row = horizontal ? startRow : startRow + i;
      const col = horizontal ? startCol + i : startCol;
      if (row <= 9 && col <= 9) {
        cells.push(battleshipRowColToPos(row, col));
      }
    }
    
    return cells;
  };

  // Handle cell click during setup
  const handleSetupClick = (pos: number) => {
    if (!inSetupPhase || amIReady || currentShipIndex >= BATTLESHIP_SHIPS.length) return;
    
    if (!isValidPlacement(currentShipIndex, pos, isHorizontal)) return;
    
    const newPlacement: ShipPlacement = {
      shipIndex: currentShipIndex,
      startPos: pos,
      horizontal: isHorizontal,
    };
    
    const newPlacements = [...shipPlacements, newPlacement];
    setShipPlacements(newPlacements);
    setCurrentShipIndex(currentShipIndex + 1);
    
    // If all ships placed, submit
    if (newPlacements.length === BATTLESHIP_SHIPS.length) {
      // Contract format: "ship_id,start_pos,horizontal;ship_id,start_pos,horizontal;..."
      // ship_id: 1=carrier(5), 2=battleship(4), 3=cruiser(3), 4=submarine(3), 5=destroyer(2)
      const shipData = newPlacements.map((p) => 
        `${p.shipIndex + 1},${p.startPos},${p.horizontal ? 'h' : 'v'}`
      ).join(';');
      onPlaceShips(shipData);
    }
  };

  // Handle attack click
  const handleAttackClick = (pos: number) => {
    if (inSetupPhase || !isMyTurn || disabled) return;
    if (myHits.includes(pos)) return; // Already attacked
    onAttack(pos);
  };

  // Get all placed ship cells
  const getPlacedShipCells = (): Set<number> => {
    const cells = new Set<number>();
    shipPlacements.forEach((p) => {
      getShipCells(p.shipIndex, p.startPos, p.horizontal).forEach((c) => cells.add(c));
    });
    return cells;
  };

  const placedCells = getPlacedShipCells();
  const hoverCells = hoverPos !== null && currentShipIndex < BATTLESHIP_SHIPS.length
    ? new Set(getShipCells(currentShipIndex, hoverPos, isHorizontal))
    : new Set<number>();
  const isHoverValid = hoverPos !== null && currentShipIndex < BATTLESHIP_SHIPS.length
    ? isValidPlacement(currentShipIndex, hoverPos, isHorizontal)
    : false;

  // Render a 10x10 grid
  // cells = ship positions (0=water, 1-5=ship_id)
  // hits = attack results (0=unknown, 1=miss, 2=hit)
  const renderGrid = (
    title: string,
    ships: number[],
    hits: number[],
    onClick: (pos: number) => void,
    showShips: boolean,
    isSetup: boolean = false,
  ) => (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-bold mb-2">{title}</h3>
      <div className="bg-blue-900 p-1 rounded-lg">
        <div className="grid grid-cols-10 gap-0.5">
          {Array.from({ length: 100 }).map((_, idx) => {
            const shipId = ships[idx] ?? 0;
            const hitStatus = hits[idx] ?? 0;
            const hasShip = shipId > 0 || placedCells.has(idx);
            const wasAttacked = hitStatus > 0;
            const isHit = hitStatus === 2;
            const isMiss = hitStatus === 1;
            const isHovered = hoverCells.has(idx);
            
            return (
              <div
                key={idx}
                onClick={() => onClick(idx)}
                onMouseEnter={() => isSetup && setHoverPos(idx)}
                onMouseLeave={() => isSetup && setHoverPos(null)}
                className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-sm
                  transition-colors cursor-pointer
                  ${showShips && hasShip ? 'bg-gray-600' : 'bg-blue-800'}
                  ${isHovered ? (isHoverValid ? 'bg-green-600' : 'bg-red-600') : ''}
                  ${!isSetup && !wasAttacked ? 'hover:bg-blue-700' : ''}`}
              >
                {isHit && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full bg-red-500"
                  />
                )}
                {isMiss && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-white/50"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (inSetupPhase) {
    return (
      <div className="flex flex-col items-center">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold mb-2">Place Your Ships</h2>
          {currentShipIndex < BATTLESHIP_SHIPS.length ? (
            <>
              <p className="text-sm text-gray-400">
                Placing: {BATTLESHIP_SHIPS[currentShipIndex].name} 
                (size {BATTLESHIP_SHIPS[currentShipIndex].size})
              </p>
              <button
                onClick={() => setIsHorizontal(!isHorizontal)}
                className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
              >
                Rotate ({isHorizontal ? 'Horizontal' : 'Vertical'})
              </button>
            </>
          ) : (
            <p className="text-green-400">All ships placed! Waiting for opponent...</p>
          )}
        </div>
        
        {renderGrid('Your Board', myShips, oppHits, handleSetupClick, true, true)}
        
        {/* Ships to place */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {BATTLESHIP_SHIPS.map((ship, idx) => (
            <div
              key={ship.name}
              className={`px-2 py-1 rounded text-xs ${
                idx < currentShipIndex
                  ? 'bg-green-600'
                  : idx === currentShipIndex
                  ? 'bg-yellow-600 ring-2 ring-yellow-400'
                  : 'bg-gray-600'
              }`}
            >
              {ship.name} ({ship.size})
            </div>
          ))}
        </div>
        
        {/* Help button in setup phase */}
        <div className="mt-4 flex items-center gap-2 text-gray-500 text-sm">
          <span>Need help?</span>
          <BattleshipHelp />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Turn indicator */}
      <div className="mb-4 text-center">
        <span className={`text-sm ${isMyTurn ? 'text-green-400' : 'text-gray-400'}`}>
          {isMyTurn ? "Your turn - attack!" : "Opponent's turn"}
        </span>
      </div>

      {/* Boards side by side */}
      <div className="flex gap-4 flex-wrap justify-center">
        {/* Your board - shows your ships and opponent's attacks */}
        {renderGrid('Your Fleet', myShips, oppHits, () => {}, true)}
        
        {/* Attack board - shows your attacks on opponent */}
        {renderGrid('Enemy Waters', oppShips, myHits, handleAttackClick, false)}
      </div>

      {/* Move count */}
      <div className="mt-4 flex items-center gap-4 text-gray-500 text-sm">
        <span>Attacks: {board.moves.length}</span>
        <span>•</span>
        <BattleshipHelp />
      </div>
    </div>
  );
}
