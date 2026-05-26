export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isDrawing: boolean;
  guessedCorrectly: boolean;
  lastGuessCorrectTime?: number;
}

export interface Stroke {
  x: number;
  y: number;
  lastX: number | null;
  lastY: number | null;
  color: string;
  size: number;
  isEraser: boolean;
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
  roundDuration: number;
  wordSelectionDuration: number;
  revealDuration: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderId?: string;
  text: string;
  type: 'chat' | 'system' | 'correct' | 'close';
  timestamp: number;
}
