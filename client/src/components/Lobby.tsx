import React, { useState } from 'react';
import { getAvatarData, getRandomAvatarIndex } from '../utils/avatar';
import { Shuffle, Sparkles, LogIn } from 'lucide-react';

interface LobbyProps {
  onJoinRoom: (username: string, roomId: string, avatarSeed: string) => void;
  initialRoomId?: string;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinRoom, initialRoomId = '' }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId || 'lobby-room');
  const [avatarIndex, setAvatarIndex] = useState(getRandomAvatarIndex());

  // Generate deterministic avatar representation based on username + offset
  const avatar = getAvatarData(username || 'guest', avatarIndex);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    // Normalize room id
    const cleanRoomId = roomId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'lobby-room';
    onJoinRoom(username.trim(), cleanRoomId, `${username.trim()}_${avatarIndex}`);
  };

  const handleRandomizeAvatar = () => {
    setAvatarIndex(getRandomAvatarIndex());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      
      {/* Background blobs for premium depth */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl" />

      {/* Container */}
      <div className="w-full max-w-md space-y-8 z-10">
        
        {/* Title Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider animate-bounce-short">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multiplayer Drawing Game</span>
          </div>
          
          <h1 className="text-5xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent filter drop-shadow-md">
              Sketchy.io
            </span>
            <span className="text-4xl filter drop-shadow">🎨</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold tracking-wide">
            Guess words, draw masterpieces, and compete with friends!
          </p>
        </div>

        {/* Setup Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Avatar customization */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div
                  style={{ background: avatar.gradient }}
                  className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-lg border-2 border-white/20 transform hover:scale-105 transition-all duration-300 relative"
                >
                  {avatar.character}
                </div>
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl shadow-md border border-indigo-400/30 hover:scale-110 active:scale-95 transition-all"
                  title="Randomize avatar character"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                Avatar preview
              </span>
            </div>

            {/* Nickname Input */}
            <div className="space-y-1.5">
              <label htmlFor="nickname" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Your Nickname
              </label>
              <input
                id="nickname"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={15}
                required
                placeholder="Enter nickname..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-3 rounded-2xl text-sm font-bold text-white placeholder-slate-600 transition-all focus:outline-none"
              />
            </div>

            {/* Room ID Input */}
            <div className="space-y-1.5">
              <label htmlFor="room-id" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Room Name / ID
              </label>
              <input
                id="room-id"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room name..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-3 rounded-2xl text-sm font-bold text-white placeholder-slate-600 transition-all focus:outline-none capitalize"
              />
            </div>

            {/* Join / Play Button */}
            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 disabled:shadow-none text-sm tracking-wider uppercase"
            >
              <LogIn className="w-4 h-4" />
              <span>Enter Game Lobby</span>
            </button>

          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-600 font-semibold tracking-wider uppercase">
          Sketchy.io &copy; {new Date().getFullYear()} &bull; Munal Mahato
        </div>

      </div>

    </div>
  );
};
export default Lobby;
