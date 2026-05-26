import { Server, Socket } from 'socket.io';
import { GameManager } from './gameEngine';
import { Player, Stroke, ChatMessage } from './types';

export function setupSocketHandlers(io: Server, gameManager: GameManager) {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let username: string | null = null;

    // Handle Player Joining Room
    socket.on('join_room', (data: { roomId: string; username: string; avatar: string }) => {
      const { roomId, username: name, avatar } = data;
      currentRoomId = roomId;
      username = name;

      socket.join(roomId);

      const player: Player = {
        id: socket.id,
        name,
        avatar,
        score: 0,
        isDrawing: false,
        guessedCorrectly: false,
      };

      // Add to game manager
      const room = gameManager.addPlayer(roomId, player);

      // Send the newly joined client the current canvas history
      socket.emit('canvas_history', room.canvasHistory);
    });

    // Handle Active Drawing stroke broadcast
    socket.on('draw_stroke', (data: { roomId: string; stroke: Stroke }) => {
      const { roomId, stroke } = data;
      const room = gameManager.getRoom(roomId);
      
      // Verification: only the active drawer can draw
      if (room && room.phase === 'DRAWING' && room.drawerId === socket.id) {
        gameManager.addStroke(roomId, stroke);
        // Broadcast stroke to other clients in the room
        socket.to(roomId).emit('draw_stroke', stroke);
      }
    });

    // Handle Clear Canvas
    socket.on('clear_canvas', (data: { roomId: string }) => {
      const { roomId } = data;
      const room = gameManager.getRoom(roomId);

      // Verification: only active drawer can clear canvas
      if (room && room.phase === 'DRAWING' && room.drawerId === socket.id) {
        room.canvasHistory = [];
        io.to(roomId).emit('clear_canvas');
      }
    });

    // Handle Undo Stroke
    socket.on('undo_stroke', (data: { roomId: string }) => {
      const { roomId } = data;
      const room = gameManager.getRoom(roomId);

      // Verification: only active drawer can undo
      if (room && room.phase === 'DRAWING' && room.drawerId === socket.id) {
        gameManager.undoLastStroke(roomId);
      }
    });

    // Handle Word Selection by Drawer
    socket.on('select_word', (data: { roomId: string; word: string }) => {
      const { roomId, word } = data;
      gameManager.selectWord(roomId, socket.id, word);
    });

    // Handle Text Chat and Guess Submissions
    socket.on('submit_guess', (data: { roomId: string; text: string }) => {
      const { roomId, text } = data;
      const room = gameManager.getRoom(roomId);
      if (!room) return;

      const senderPlayer = room.players.find(p => p.id === socket.id);
      if (!senderPlayer) return;

      // 1. If phase is not drawing, just send as standard chat
      if (room.phase !== 'DRAWING') {
        const chatMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: senderPlayer.name,
          senderId: socket.id,
          text,
          type: 'chat',
          timestamp: Date.now(),
        };
        io.to(roomId).emit('chat_message', chatMsg);
        return;
      }

      // 2. If sender is drawer, they are not allowed to guess/chat during drawing
      if (room.drawerId === socket.id) {
        // We can send a warning to drawer or ignore
        const privateMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'System',
          text: "You are the drawer! You can't chat or guess.",
          type: 'system',
          timestamp: Date.now(),
        };
        socket.emit('chat_message', privateMsg);
        return;
      }

      // 3. If player has already guessed correctly, they chat in the "green channel"
      if (senderPlayer.guessedCorrectly) {
        const greenMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: senderPlayer.name,
          senderId: socket.id,
          text,
          type: 'correct',
          timestamp: Date.now(),
        };
        
        // Broadcast only to drawer and players who also guessed correctly
        room.players.forEach(p => {
          if (p.id === room.drawerId || p.guessedCorrectly) {
            io.to(p.id).emit('chat_message', greenMsg);
          }
        });
        return;
      }

      // 4. Submit guess to Game Loop Engine
      const result = gameManager.submitGuess(roomId, socket.id, text);

      if (result.isCorrect) {
        // Player guessed correctly! 
        // Send them a private success message
        const privateSuccess: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'System',
          text: `You guessed the word! (+${room.players.find(p => p.id === socket.id)?.score ? Math.round((room.timer / room.roundDuration) * 400) + 100 : 0} pts)`,
          type: 'correct',
          timestamp: Date.now()
        };
        socket.emit('chat_message', privateSuccess);

        // Broadcast general "X guessed the word" to everyone else
        if (result.message) {
          socket.to(roomId).emit('chat_message', result.message);
        }
      } else if (result.isClose) {
        // Send private "close" warning
        const privateClose: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'System',
          text: `"${text}" is close!`,
          type: 'close',
          timestamp: Date.now(),
        };
        socket.emit('chat_message', privateClose);

        // Broadcast close guess to others as normal chat (or not, usually yes so others see their guess attempts)
        const chatMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: senderPlayer.name,
          senderId: socket.id,
          text,
          type: 'chat',
          timestamp: Date.now(),
        };
        io.to(roomId).emit('chat_message', chatMsg);
      } else {
        // Broadcast normal wrong guess to all players who haven't guessed yet
        const chatMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: senderPlayer.name,
          senderId: socket.id,
          text,
          type: 'chat',
          timestamp: Date.now(),
        };
        
        // Broadcast wrong guesses to everyone
        io.to(roomId).emit('chat_message', chatMsg);
      }
    });

    // Handle Disconnections
    socket.on('disconnect', () => {
      if (currentRoomId) {
        gameManager.removePlayer(currentRoomId, socket.id);
      }
    });
  });
}
