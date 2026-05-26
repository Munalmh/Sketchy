export interface Player {
  id: string; // Socket ID or unique ID
  name: string;
  avatar: string; // Avatar string (seed or base64 or descriptive index)
  score: number;
  isDrawing: boolean;
  guessedCorrectly: boolean;
  lastGuessCorrectTime?: number; // Socket timer value when they guessed correctly
}

export interface Stroke {
  x: number;
  y: number;
  lastX: number | null;
  lastY: number | null;
  color: string;
  size: number;
  isEraser: boolean;
  isFill?: boolean;
  pathId?: string;
}

export type GamePhase = 'LOBBY' | 'WORD_SELECTION' | 'DRAWING' | 'REVEAL' | 'GAME_OVER';

export interface RoomState {
  id: string;
  players: Player[];
  phase: GamePhase;
  currentRound: number;
  maxRounds: number;
  timer: number;
  drawerId: string | null;
  secretWord: string;
  selectableWords: string[];
  revealedIndices: number[];
  canvasHistory: Stroke[];
  roundDuration: number; // e.g. 60s
  wordSelectionDuration: number; // e.g. 15s
  revealDuration: number; // e.g. 5s
}

export interface ChatMessage {
  id: string;
  sender: string; // "System" or player name
  senderId?: string;
  text: string;
  type: 'chat' | 'system' | 'correct' | 'close';
  timestamp: number;
}
