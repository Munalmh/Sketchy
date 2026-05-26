import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomState, ChatMessage } from '../types';
import { Canvas } from './Canvas';
import { Scoreboard } from './Scoreboard';
import { Chat } from './Chat';
import { WordSelection } from './WordSelection';
import { getAvatarData } from '../utils/avatar';
import { Trophy, Timer, Star, Award, ArrowLeft } from 'lucide-react';

interface GameRoomProps {
  roomId: string;
  username: string;
  avatarSeed: string;
  onLeaveRoom: () => void;
}

const BACKEND_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5050' 
  : 'https://sketchy-backend-uw3w.onrender.com';

export const GameRoom: React.FC<GameRoomProps> = ({
  roomId,
  username,
  avatarSeed,
  onLeaveRoom,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Setup WebSocket connection
  useEffect(() => {
    const socketInstance = io(BACKEND_URL, {
      transports: ['websocket'],
    });

    setSocket(socketInstance);

    // Join room on connection
    socketInstance.emit('join_room', {
      roomId,
      username,
      avatar: avatarSeed,
    });

    // Listen to Room updates
    socketInstance.on('room_state_update', (updatedState: RoomState) => {
      setRoomState(updatedState);
    });

    // Listen to chat and system messages
    socketInstance.on('chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Handle connection drops
    socketInstance.on('disconnect', () => {
      // Reconnection or logout
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [roomId, username, avatarSeed]);

  // Actions
  const handleSendMessage = (text: string) => {
    if (socket) {
      socket.emit('submit_guess', { roomId, text });
    }
  };

  const handleSelectWord = (word: string) => {
    if (socket) {
      socket.emit('select_word', { roomId, word });
    }
  };

  if (!roomState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 space-y-4 select-none">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-bold tracking-wider text-slate-400">Connecting to game room...</span>
      </div>
    );
  }

  const currentPlayer = roomState.players.find(p => p.id === socket?.id);
  const isDrawer = roomState.drawerId === socket?.id;
  const drawerPlayer = roomState.players.find(p => p.id === roomState.drawerId);
  const hasGuessedCorrectly = currentPlayer?.guessedCorrectly || false;

  // Sorting for GameOver Podium display
  const podiumPlayers = [...roomState.players]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Render top status bar depending on phase
  const renderTopBar = () => {
    if (roomState.phase === 'LOBBY') {
      return (
        <div className="flex items-center justify-center p-3 text-slate-300 font-semibold text-xs tracking-wider gap-2">
          <span>Lobby Mode &bull; Need 2+ players to start.</span>
          {roomState.timer > 0 && (
            <span className="text-amber-400 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full ml-1">
              Starting in {roomState.timer}s
            </span>
          )}
        </div>
      );
    }

    if (roomState.phase === 'WORD_SELECTION') {
      return (
        <div className="flex items-center justify-center p-3 text-slate-300 font-semibold text-xs tracking-wider">
          <span>Word selection in progress...</span>
        </div>
      );
    }

    if (roomState.phase === 'REVEAL') {
      return (
        <div className="flex items-center justify-center p-3 bg-emerald-950/20 text-emerald-400 font-extrabold text-sm tracking-wide gap-1 rounded-2xl border border-emerald-900/30">
          <span>The secret word was:</span>
          <span className="bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-lg shadow-sm tracking-widest uppercase">
            {roomState.secretWord}
          </span>
        </div>
      );
    }

    if (roomState.phase === 'GAME_OVER') {
      return (
        <div className="flex items-center justify-center p-3 bg-indigo-950/20 text-indigo-400 font-extrabold text-sm tracking-wide gap-1 rounded-2xl border border-indigo-900/30">
          <span>👑 Game Over! Showing final scores.</span>
        </div>
      );
    }

    // DRAWING phase: show obscured/revealed word and drawers info
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2 bg-slate-900/40 border border-slate-700/20 rounded-2xl">
        {/* Left: Drawer description */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
          {isDrawer ? (
            <span>You are drawing:</span>
          ) : (
            <span>
              <strong className="text-indigo-400">{drawerPlayer?.name}</strong> is drawing:
            </span>
          )}
          
          {/* Secret word reveal if drawer/guessed, else obscured letter slots */}
          {isDrawer || hasGuessedCorrectly ? (
            <span className="text-indigo-400 font-bold bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded-lg select-all cursor-pointer">
              {roomState.secretWord}
            </span>
          ) : null}
        </div>

        {/* Center: The Word Hint Letters Slots */}
        {!(isDrawer || hasGuessedCorrectly) && roomState.secretWord && (
          <div className="flex gap-1.5 items-center justify-center py-1">
            {roomState.secretWord.split(' ').map((char, index) => {
              if (char === '_') {
                return <div key={index} className="w-5 h-7 border-b-2 border-slate-400 mt-1 mx-0.5" />;
              }
              if (char === '-') {
                return <div key={index} className="w-3 h-7 flex items-center justify-center text-slate-500 font-bold">-</div>;
              }
              return (
                <div
                  key={index}
                  className="w-6 h-7 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-black text-xs flex items-center justify-center shadow-md select-none transform scale-105 capitalize"
                >
                  {char}
                </div>
              );
            })}
          </div>
        )}

        {/* Right: Hint status */}
        <div className="text-[10px] bg-slate-800 border border-slate-750 text-slate-400 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
          Length: {roomState.secretWord?.replace(/[\s-]/g, '').length || 0} letters
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Game Room Header */}
      <header className="bg-slate-900 border-b border-slate-850 px-4 py-3 flex items-center justify-between z-10 shrink-0">
        
        {/* Logo and Room name */}
        <div className="flex items-center gap-4">
          <button
            onClick={onLeaveRoom}
            className="text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-800 rounded-xl transition-all"
            title="Leave game room"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col">
            <span className="font-extrabold text-sm text-indigo-400 tracking-tight flex items-center gap-1">
              Sketchy.io 🎨
            </span>
            <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase leading-none mt-0.5">
              Room: {roomState.id}
            </span>
          </div>
        </div>

        {/* Dynamic header updates (Timer & rounds) */}
        {roomState.phase !== 'LOBBY' && (
          <div className="flex items-center gap-3">
            {/* Round Counter */}
            <div className="flex items-center gap-1 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-700/30 text-xs font-bold text-slate-300">
              <Star className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Round {roomState.currentRound} / {roomState.maxRounds}
              </span>
            </div>

            {/* Turn Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-extrabold text-xs transition-all ${
                roomState.timer <= 10 && roomState.phase === 'DRAWING'
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-400 animate-pulse-fast'
                  : 'bg-slate-850 border-slate-700/30 text-slate-300'
              }`}
            >
              <Timer className="w-3.5 h-3.5 text-amber-500" />
              <span className="tabular-nums">{roomState.timer}s</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-grow p-4 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden min-h-0">
        
        {/* Left Side: Scoreboard (1 col) */}
        <div className="md:col-span-1 h-full flex flex-col order-2 md:order-1">
          <Scoreboard
            players={roomState.players}
            drawerId={roomState.drawerId}
            currentPlayerId={socket?.id || null}
          />
        </div>

        {/* Center Side: Drawing Surface + overlays (2 cols) */}
        <div className="md:col-span-2 h-full flex flex-col space-y-3 order-1 md:order-2">
          {/* Status Hint Bar */}
          {renderTopBar()}

          {/* Drawing Canvas Container */}
          <div className="relative flex-grow min-h-0 bg-slate-900/20 rounded-2xl">
            <Canvas
              isDrawer={isDrawer}
              socket={socket}
              roomId={roomId}
              canvasHistory={roomState.canvasHistory}
            />

            {/* Word Selection Popup Overlay */}
            {roomState.phase === 'WORD_SELECTION' && (
              <WordSelection
                isDrawer={isDrawer}
                selectableWords={roomState.selectableWords}
                timer={roomState.timer}
                drawerName={drawerPlayer?.name || 'Drawer'}
                onSelectWord={handleSelectWord}
              />
            )}

            {/* Game Over Podium Overlay */}
            {roomState.phase === 'GAME_OVER' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-700/50 z-25 overflow-y-auto">
                <div className="text-center space-y-6 max-w-md w-full">
                  <div className="flex justify-center">
                    <div className="bg-amber-500/10 border border-amber-400/30 p-3 rounded-full text-amber-400 animate-bounce">
                      <Trophy className="w-8 h-8" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight">Final Rankings!</h2>
                    <p className="text-xs text-slate-400">
                      Great drawings, everyone! Restarting the lobby in <span className="text-amber-500 font-bold">{roomState.timer}s</span>.
                    </p>
                  </div>

                  {/* The Podium structure */}
                  <div className="flex items-end justify-center gap-3 pt-6 min-h-48">
                    
                    {/* 2nd Place */}
                    {podiumPlayers[1] && (
                      <div className="flex flex-col items-center flex-1">
                        <div
                          style={{ background: getAvatarData(podiumPlayers[1].name).gradient }}
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-white/10 shadow-md mb-2"
                        >
                          {getAvatarData(podiumPlayers[1].name).character}
                        </div>
                        <span className="text-xs font-bold text-slate-300 truncate max-w-20">{podiumPlayers[1].name}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{podiumPlayers[1].score} pts</span>
                        <div className="w-full bg-slate-800 border border-slate-700/50 rounded-t-xl h-20 mt-2 flex items-center justify-center font-bold text-slate-400">
                          2nd
                        </div>
                      </div>
                    )}

                    {/* 1st Place */}
                    {podiumPlayers[0] && (
                      <div className="flex flex-col items-center flex-1 z-10 scale-110">
                        <div className="relative">
                          <Award className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 text-amber-400 animate-pulse" />
                          <div
                            style={{ background: getAvatarData(podiumPlayers[0].name).gradient }}
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-2 border-amber-400 shadow-lg mb-2 relative"
                          >
                            {getAvatarData(podiumPlayers[0].name).character}
                          </div>
                        </div>
                        <span className="text-xs font-black text-amber-400 truncate max-w-20">{podiumPlayers[0].name}</span>
                        <span className="text-[10px] text-amber-300/80 font-bold">{podiumPlayers[0].score} pts</span>
                        <div className="w-full bg-indigo-650 border border-indigo-500/50 rounded-t-2xl h-28 mt-2 flex items-center justify-center font-black text-indigo-100 shadow-md">
                          1st
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {podiumPlayers[2] && (
                      <div className="flex flex-col items-center flex-1">
                        <div
                          style={{ background: getAvatarData(podiumPlayers[2].name).gradient }}
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border border-white/10 shadow-sm mb-2"
                        >
                          {getAvatarData(podiumPlayers[2].name).character}
                        </div>
                        <span className="text-xs font-bold text-slate-400 truncate max-w-20">{podiumPlayers[2].name}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{podiumPlayers[2].score} pts</span>
                        <div className="w-full bg-slate-850 border border-slate-750 rounded-t-lg h-14 mt-2 flex items-center justify-center font-bold text-slate-500">
                          3rd
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Chat & Guess Feed (1 col) */}
        <div className="md:col-span-1 h-full flex flex-col order-3">
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            isDrawer={isDrawer}
            hasGuessedCorrectly={hasGuessedCorrectly}
            gamePhase={roomState.phase}
          />
        </div>

      </main>

    </div>
  );
};
export default GameRoom;
