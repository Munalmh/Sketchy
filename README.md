# Sketchy.io 🎨

Sketchy.io is a production-ready, real-time multiplayer drawing and guessing game. It features a modern, responsive user interface with glassmorphic styling, seed-based dynamic avatars, and interactive scoreboard lists.

## 🚀 Tech Stack

*   **Frontend**: React (Hooks + Functional Components), TypeScript, Tailwind CSS v4, Lucide React (Icons), Socket.io-client.
*   **Backend**: Node.js, Express, TypeScript, Socket.io.

## 🏗️ Core Architecture & Features

1.  **Unified Canvas Viewport**: Coordinates are normalized to a logical **800x500** grid before broadcasting. This guarantees that drawings render with pixel-accuracy across all screen sizes (mobile, tablet, and desktop).
2.  **Anti-Cheat Protection**: The server obscures the secret word template and reveals letters dynamically, sending the actual word *only* to the drawer or guessers who have already found it.
3.  **Multi-Channel Chat**: Correct guesses are automatically hidden from other guessers to prevent spoilers. Winners get placed in a private "green channel" to discuss the drawing without revealing the word.
4.  **Automatic State Machine**: Robust round transitions: LOBBY countdown $\rightarrow$ WORD_SELECTION (15s) $\rightarrow$ DRAWING (60s) $\rightarrow$ REVEAL (7s) $\rightarrow$ GAME_OVER podium.

---

## 🛠️ Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm (v9 or higher)

### 1. Run the Backend Server

```bash
cd server
npm install
npm run dev
```

The backend starts a real-time Socket.io server on port `5050`.

### 2. Run the Frontend Client

```bash
cd client
npm install
npm run dev
```

Open your browser to the URL printed in the terminal (usually `http://localhost:5173`).

---

## 👥 Testing Multiplayer

1.  Open the game URL (`http://localhost:5173`) in one tab and join a room.
2.  Open the same URL in a second tab (or an incognito window) and join the same room.
3.  Once both players join, the lobby will start a 10-second countdown and transition into the game loop!
