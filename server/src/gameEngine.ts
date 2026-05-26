import { Server } from 'socket.io';
import { RoomState, Player, Stroke, GamePhase, ChatMessage } from './types';
import { getRandomWords } from './words';

export class GameManager {
  private io: Server;
  public rooms: Map<string, RoomState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private hintTimers: Map<string, NodeJS.Timeout[]> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  public getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  public createRoom(roomId: string, maxRounds = 3): RoomState {
    const room: RoomState = {
      id: roomId,
      players: [],
      phase: 'LOBBY',
      currentRound: 1,
      maxRounds,
      timer: 0,
      drawerId: null,
      secretWord: '',
      selectableWords: [],
      revealedIndices: [],
      canvasHistory: [],
      roundDuration: 60,
      wordSelectionDuration: 15,
      revealDuration: 7,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  public addPlayer(roomId: string, player: Player): RoomState {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = this.createRoom(roomId);
    }
    
    // Check if player already in room
    const exists = room.players.find(p => p.id === player.id);
    if (!exists) {
      room.players.push(player);
    }

    this.sendSystemMessage(roomId, `${player.name} joined the room.`);
    
    // Auto start check
    if (room.phase === 'LOBBY' && room.players.length >= 2 && !this.timers.has(roomId)) {
      this.startLobbyCountdown(roomId);
    }

    this.broadcastState(roomId);
    return room;
  }

  public removePlayer(roomId: string, playerId: string): RoomState | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return room;

    const [player] = room.players.splice(playerIndex, 1);
    this.sendSystemMessage(roomId, `${player.name} left the room.`);

    // If active drawer leaves, end round early
    if (room.drawerId === playerId) {
      this.sendSystemMessage(roomId, "The drawer left the game. Ending round.");
      this.clearAllRoomTimers(roomId);
      this.revealRound(roomId);
    } else {
      // If guess status needs updates
      this.checkRoundEndConditions(roomId);
    }

    // If lobby goes below 2 players, stop countdown
    if (room.phase === 'LOBBY' && room.players.length < 2) {
      this.clearAllRoomTimers(roomId);
      room.timer = 0;
    }

    // If room is empty, delete it
    if (room.players.length === 0) {
      this.clearAllRoomTimers(roomId);
      this.rooms.delete(roomId);
      return null;
    }

    this.broadcastState(roomId);
    return room;
  }

  private startLobbyCountdown(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.timer = 10;
    this.broadcastState(roomId);

    const interval = setInterval(() => {
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom) {
        clearInterval(interval);
        return;
      }

      if (currentRoom.players.length < 2) {
        clearInterval(interval);
        currentRoom.timer = 0;
        this.timers.delete(roomId);
        this.broadcastState(roomId);
        return;
      }

      currentRoom.timer -= 1;
      this.broadcastState(roomId);

      if (currentRoom.timer <= 0) {
        clearInterval(interval);
        this.timers.delete(roomId);
        this.startGame(roomId);
      }
    }, 1000);

    this.timers.set(roomId, interval);
  }

  public startGame(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.phase = 'WORD_SELECTION';
    room.currentRound = 1;
    room.drawerId = null;
    room.players.forEach(p => {
      p.score = 0;
      p.guessedCorrectly = false;
      p.isDrawing = false;
    });

    this.sendSystemMessage(roomId, "The game is starting!");
    this.startWordSelection(roomId);
  }

  private startWordSelection(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.clearAllRoomTimers(roomId);
    room.phase = 'WORD_SELECTION';
    room.canvasHistory = [];
    room.revealedIndices = [];
    room.players.forEach(p => {
      p.guessedCorrectly = false;
      p.isDrawing = false;
    });

    // Find next drawer
    const currentDrawerIndex = room.players.findIndex(p => p.id === room.drawerId);
    let nextDrawerIndex = 0;
    if (currentDrawerIndex !== -1) {
      nextDrawerIndex = currentDrawerIndex + 1;
    }

    if (nextDrawerIndex >= room.players.length) {
      room.currentRound += 1;
      nextDrawerIndex = 0;
    }

    // Check if max rounds reached
    if (room.currentRound > room.maxRounds) {
      this.endGame(roomId);
      return;
    }

    const drawer = room.players[nextDrawerIndex];
    if (!drawer) {
      this.endGame(roomId);
      return;
    }

    drawer.isDrawing = true;
    room.drawerId = drawer.id;
    room.selectableWords = getRandomWords(3);
    room.timer = room.wordSelectionDuration;

    this.sendSystemMessage(roomId, `${drawer.name} is choosing a word.`);
    this.broadcastState(roomId);

    // Start countdown for word selection
    const interval = setInterval(() => {
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom) {
        clearInterval(interval);
        return;
      }

      currentRoom.timer -= 1;
      this.broadcastState(roomId);

      if (currentRoom.timer <= 0) {
        clearInterval(interval);
        this.timers.delete(roomId);
        // Auto select a random word if drawer times out
        const randomWord = currentRoom.selectableWords[Math.floor(Math.random() * currentRoom.selectableWords.length)] || "apple";
        this.startDrawing(roomId, randomWord);
      }
    }, 1000);

    this.timers.set(roomId, interval);
  }

  public selectWord(roomId: string, playerId: string, word: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'WORD_SELECTION' || room.drawerId !== playerId) return;

    if (!room.selectableWords.includes(word)) return;

    this.clearAllRoomTimers(roomId);
    this.startDrawing(roomId, word);
  }

  private startDrawing(roomId: string, word: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.phase = 'DRAWING';
    room.secretWord = word.toLowerCase().trim();
    room.timer = room.roundDuration;
    room.canvasHistory = [];
    room.revealedIndices = [];
    
    // Clear canvas on all clients
    this.io.to(roomId).emit('clear_canvas');

    const drawerName = room.players.find(p => p.id === room.drawerId)?.name || 'Someone';
    this.sendSystemMessage(roomId, `${drawerName} is drawing now!`);
    this.broadcastState(roomId);

    // Setup Hint timing
    const hintsTimers: NodeJS.Timeout[] = [];
    const wordLen = room.secretWord.length;
    
    const queueHintReveal = (secondsRemaining: number) => {
      const delay = (room.roundDuration - secondsRemaining) * 1000;
      const t = setTimeout(() => {
        const curRoom = this.rooms.get(roomId);
        if (!curRoom || curRoom.phase !== 'DRAWING') return;

        // Find indices that can be revealed (exclude spaces, hyphens and already revealed)
        const unrevealed: number[] = [];
        for (let i = 0; i < curRoom.secretWord.length; i++) {
          const char = curRoom.secretWord[i];
          if (char !== ' ' && char !== '-' && !curRoom.revealedIndices.includes(i)) {
            unrevealed.push(i);
          }
        }

        if (unrevealed.length > 0) {
          const randIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
          curRoom.revealedIndices.push(randIndex);
          
          // Send hint update message
          this.sendSystemMessage(roomId, `Hint: A letter has been revealed!`);
          this.broadcastState(roomId);
        }
      }, delay);
      hintsTimers.push(t);
    };

    // Hint scheduling based on word length
    if (wordLen >= 6) {
      queueHintReveal(40);
      queueHintReveal(20);
    } else if (wordLen >= 4) {
      queueHintReveal(30);
    }
    this.hintTimers.set(roomId, hintsTimers);

    // Core Drawing countdown
    const interval = setInterval(() => {
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom) {
        clearInterval(interval);
        return;
      }

      currentRoom.timer -= 1;
      this.broadcastState(roomId);

      if (currentRoom.timer <= 0) {
        clearInterval(interval);
        this.timers.delete(roomId);
        this.sendSystemMessage(roomId, `Time's up! The word was "${currentRoom.secretWord}".`);
        this.revealRound(roomId);
      }
    }, 1000);

    this.timers.set(roomId, interval);
  }

  public submitGuess(roomId: string, playerId: string, text: string): { isCorrect: boolean; isClose: boolean; message?: ChatMessage } {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'DRAWING') {
      return { isCorrect: false, isClose: false };
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { isCorrect: false, isClose: false };

    // Drawer cannot guess
    if (room.drawerId === playerId) {
      return { isCorrect: false, isClose: false };
    }

    // Already guessed correctly
    if (player.guessedCorrectly) {
      return { isCorrect: false, isClose: false };
    }

    const guess = text.toLowerCase().trim();
    const secret = room.secretWord;

    if (guess === secret) {
      player.guessedCorrectly = true;
      player.lastGuessCorrectTime = room.timer;

      // Score Allocation
      const guesserPoints = Math.round((room.timer / room.roundDuration) * 400) + 100;
      player.score += guesserPoints;

      // Drawer: +50 for each correct guesser
      const drawer = room.players.find(p => p.id === room.drawerId);
      if (drawer) {
        drawer.score += 50;
      }

      // Prepare custom message object for correct guess
      const chatMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'System',
        text: `${player.name} guessed the word!`,
        type: 'correct',
        senderId: player.id,
        timestamp: Date.now(),
      };

      // Broadcast room update
      this.broadcastState(roomId);

      // Check if everyone has guessed
      this.checkRoundEndConditions(roomId);

      return { isCorrect: true, isClose: false, message: chatMsg };
    }

    // Check if close guess (Levenshtein distance == 1)
    const distance = this.getLevenshteinDistance(guess, secret);
    const isClose = distance === 1 && secret.length > 2;

    return { isCorrect: false, isClose };
  }

  private checkRoundEndConditions(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'DRAWING') return;

    const guessers = room.players.filter(p => p.id !== room.drawerId);
    const correctGuessers = guessers.filter(p => p.guessedCorrectly);

    if (guessers.length > 0 && correctGuessers.length === guessers.length) {
      this.sendSystemMessage(roomId, "Everyone guessed the word correctly!");
      this.clearAllRoomTimers(roomId);
      this.revealRound(roomId);
    }
  }

  private revealRound(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.clearAllRoomTimers(roomId);
    room.phase = 'REVEAL';
    room.timer = room.revealDuration;
    this.broadcastState(roomId);

    const interval = setInterval(() => {
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom) {
        clearInterval(interval);
        return;
      }

      currentRoom.timer -= 1;
      this.broadcastState(roomId);

      if (currentRoom.timer <= 0) {
        clearInterval(interval);
        this.timers.delete(roomId);
        this.startWordSelection(roomId);
      }
    }, 1000);

    this.timers.set(roomId, interval);
  }

  private endGame(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.clearAllRoomTimers(roomId);
    room.phase = 'GAME_OVER';
    room.timer = 10;
    this.broadcastState(roomId);

    const interval = setInterval(() => {
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom) {
        clearInterval(interval);
        return;
      }

      currentRoom.timer -= 1;
      this.broadcastState(roomId);

      if (currentRoom.timer <= 0) {
        clearInterval(interval);
        this.timers.delete(roomId);
        
        // Reset to lobby
        currentRoom.phase = 'LOBBY';
        currentRoom.currentRound = 1;
        currentRoom.drawerId = null;
        currentRoom.players.forEach(p => {
          p.score = 0;
          p.guessedCorrectly = false;
          p.isDrawing = false;
        });
        currentRoom.timer = 0;
        
        // Check if there are still enough players to restart
        if (currentRoom.players.length >= 2) {
          this.startLobbyCountdown(roomId);
        } else {
          this.broadcastState(roomId);
        }
      }
    }, 1000);

    this.timers.set(roomId, interval);
  }

  private clearAllRoomTimers(roomId: string) {
    // Round / Lobby timer
    const t = this.timers.get(roomId);
    if (t) {
      clearInterval(t);
      this.timers.delete(roomId);
    }

    // Hint timers
    const ht = this.hintTimers.get(roomId);
    if (ht) {
      ht.forEach(timer => clearTimeout(timer));
      this.hintTimers.delete(roomId);
    }
  }

  public addStroke(roomId: string, stroke: Stroke) {
    const room = this.rooms.get(roomId);
    if (room && room.phase === 'DRAWING') {
      room.canvasHistory.push(stroke);
    }
  }

  public undoLastStroke(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.canvasHistory.length === 0) return;

    // Find the pathId of the very last stroke segment
    const lastStroke = room.canvasHistory[room.canvasHistory.length - 1];
    const lastPathId = lastStroke.pathId;

    if (lastPathId) {
      // Remove all strokes with the same pathId
      room.canvasHistory = room.canvasHistory.filter(s => s.pathId !== lastPathId);
    } else {
      // Fallback
      room.canvasHistory.pop();
    }

    this.broadcastState(roomId);
  }

  public broadcastState(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Send a tailored state update to each socket to prevent cheating
    room.players.forEach(player => {
      const isDrawer = player.id === room.drawerId;
      const hasGuessed = player.guessedCorrectly;
      const revealFullWord = room.phase === 'REVEAL' || room.phase === 'GAME_OVER' || isDrawer || hasGuessed;

      const customizedState = {
        ...room,
        // Only include secret word if they are allowed to see it, otherwise obscure it
        secretWord: revealFullWord ? room.secretWord : this.getObscuredWord(room.secretWord, roomId),
        selectableWords: isDrawer && room.phase === 'WORD_SELECTION' ? room.selectableWords : [],
      };

      this.io.to(player.id).emit('room_state_update', customizedState);
    });
  }

  private getObscuredWord(word: string, roomId: string): string {
    const room = this.rooms.get(roomId);
    if (!room || !word) return '';
    return this.getObscuredWordActual(word, room.revealedIndices);
  }

  public getObscuredWordActual(word: string, revealedIndices: number[]): string {
    return word
      .split('')
      .map((char, index) => {
        if (char === ' ' || char === '-') return char;
        return revealedIndices.includes(index) ? char : '_';
      })
      .join(' ');
  }

  public sendSystemMessage(roomId: string, text: string) {
    const msg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'System',
      text,
      type: 'system',
      timestamp: Date.now()
    };
    this.io.to(roomId).emit('chat_message', msg);
  }

  private getLevenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}
