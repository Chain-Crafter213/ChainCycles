# ChainCycles 🎮

<div align="center">

![ChainCycles Banner](https://img.shields.io/badge/ChainCycles-On--Chain%20Gaming-00ffff?style=for-the-badge&logo=gamepad&logoColor=white)

**The Ultimate On-Chain Multiplayer Game Arcade**

[![Linera](https://img.shields.io/badge/Built%20on-Linera-ff00ff?style=flat-square)](https://linera.io)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Live Demo](https://chaincycles.vercel.app) • [Documentation](#-documentation) • [Getting Started](#-getting-started)

</div>

---

## 🎯 Overview

**ChainCycles** is a fully decentralized, on-chain multiplayer game arcade built on the **Linera Protocol**. Play 6 classic strategy games where every move, every state, and every outcome is verified entirely on-chain through smart contracts.

### ✨ Key Features

- 🎲 **6 Classic Games** - Chess, Connect Four, Reversi, Gomoku, Battleship, Mancala
- ⛓️ **100% On-Chain** - All game logic runs in Rust smart contracts
- 🌐 **Cross-Chain Multiplayer** - Players interact across their own microchains
- 🏆 **Rewards System** - Earn XP and coins for victories
- ⚡ **Instant Finality** - Powered by Linera's microchain architecture
- 🔒 **Trustless** - No central server, no cheating possible

---

## 🎲 The Games

| Game | Description | Board Size |
|------|-------------|------------|
| ♟️ **Chess** | Classic strategy with full rules (castling, en passant, promotion) | 8×8 |
| 🔴 **Connect Four** | Drop pieces to connect 4 in a row | 7×6 |
| ⚫ **Reversi** | Flip opponent pieces by outflanking | 8×8 |
| ⭕ **Gomoku** | Get 5 in a row to win | 15×15 |
| 🚢 **Battleship** | Sink your opponent's fleet | 10×10 |
| 🥣 **Mancala** | Ancient stone-capturing strategy | 14 pits |

---

## 🚀 Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) 1.75+ with `wasm32-unknown-unknown` target
- [Node.js](https://nodejs.org/) 18+
- [Linera CLI](https://linera.dev/)

### Installation

```bash
# Clone the repository
git clone https://github.com/Chain-Crafter213/ChainCycles.git
cd ChainCycles

# Install Rust WASM target
rustup target add wasm32-unknown-unknown

# Build the smart contract
cd contracts/chaincycles
cargo build --release --target wasm32-unknown-unknown

# Install frontend dependencies
cd ../../frontend
npm install
```

### Running Locally

```bash
# Start the frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` to play!

---

## 🏗️ Architecture

### Cross-Chain Game Flow

```
Player 1 Chain                              Player 2 Chain
┌──────────────┐                           ┌──────────────┐
│ CreateRoom   │                           │ JoinRoom     │
│ game_type    │                           │ host_chain   │
└──────┬───────┘                           └──────┬───────┘
       │                                          │
       │◄─────── JoinRequest Message ─────────────┤
       │                                          │
       ├─────── GameStateSync Message ───────────►│
       │                                          │
       │◄─────── GameMoveSync ────────────────────┤
       │         (Player 2 moves)                 │
       │                                          │
       ├─────── GameMoveSync ────────────────────►│
       │        (Player 1 moves)                  │
       │                                          │
       └─────── RewardSync (game ends) ──────────►│
```

1. **Player 1** creates a room on their chain
2. **Player 2** sends a `JoinRequest` message to Player 1's chain
3. Player 1's chain sends back `GameStateSync` with the initial board
4. Players take turns, each move triggers `GameMoveSync` to the opponent
5. When game ends, `RewardSync` messages distribute XP/coins

---

## 📁 Project Structure

```
ChainCycles/
├── contracts/chaincycles/     # Linera smart contract (Rust)
│   └── src/
│       ├── lib.rs             # Types, game boards, logic
│       ├── contract.rs        # Message handling, moves
│       ├── service.rs         # GraphQL API
│       └── state.rs           # Persistent state
│
├── frontend/                   # React application
│   └── src/
│       ├── components/        # UI components
│       │   └── games/         # Game-specific components
│       ├── lib/               # Linera adapter, API
│       ├── pages/             # Route pages
│       └── stores/            # Zustand state
│
└── README.md
```

---

## 🔧 Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
VITE_FAUCET_URL=https://faucet.testnet-archimedes.linera.net
VITE_APPLICATION_ID=7f6e89e28fa1c64b2ac87262e90bca5c6ebd66583f1f86e03a54f9d31a26128a
```

---

## 🏆 Reward System

| Game | Winner XP | Winner Coins | Loser XP | Loser Coins |
|------|-----------|--------------|----------|-------------|
| Chess | 150 | 100 | 50 | 15 |
| Connect Four | 75 | 40 | 30 | 8 |
| Reversi | 100 | 60 | 40 | 12 |
| Gomoku | 80 | 45 | 30 | 10 |
| Battleship | 120 | 70 | 45 | 15 |
| Mancala | 80 | 50 | 30 | 10 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Smart Contract** | Rust + Linera SDK 0.15.8 |
| **Frontend** | React 18 + TypeScript + Vite |
| **State Management** | Zustand |
| **Styling** | Tailwind CSS |
| **Animation** | Framer Motion |
| **API** | GraphQL (async-graphql) |

---

## 💡 Why Linera?

| Feature | Benefit |
|---------|---------|
| **Microchains** | Each player owns their chain - true decentralization |
| **Parallel Processing** | Multiple games run simultaneously without congestion |
| **Low Latency** | Moves processed instantly on player's chain |
| **Cross-Chain Messaging** | Seamless multiplayer across chains |
| **Cost Efficiency** | No gas wars, predictable costs |

---

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Set root directory to `frontend`
4. Add environment variables:
   - `VITE_FAUCET_URL`
   - `VITE_APPLICATION_ID`
5. Deploy!

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built with ❤️ on Linera Protocol**

</div>
