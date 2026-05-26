import React from 'react';
import type { Player } from '../types';
import { getAvatarData } from '../utils/avatar';
import { Pencil, CheckCircle2, User } from 'lucide-react';

interface ScoreboardProps {
  players: Player[];
  drawerId: string | null;
  currentPlayerId: string | null;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ players, drawerId, currentPlayerId }) => {
  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-700/30 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden">
      
      {/* Title Header */}
      <div className="bg-slate-800/80 px-4 py-3.5 border-b border-slate-700/30 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-200 tracking-wide uppercase">Scoreboard</h3>
        <span className="bg-slate-900/80 border border-slate-700/50 text-[10px] text-indigo-400 font-bold px-2 py-0.5 rounded-full">
          {players.length} {players.length === 1 ? 'Player' : 'Players'}
        </span>
      </div>

      {/* Players List */}
      <div className="flex-grow overflow-y-auto p-3 space-y-2 max-h-[450px] md:max-h-none scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {sortedPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-xs">
            <User className="w-8 h-8 opacity-40 mb-2" />
            <span>Waiting for players...</span>
          </div>
        ) : (
          sortedPlayers.map((player, index) => {
            const isDrawer = player.id === drawerId;
            const isSelf = player.id === currentPlayerId;
            const avatar = getAvatarData(player.name);

            return (
              <div
                key={player.id}
                className={`relative flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                  player.guessedCorrectly
                    ? 'bg-emerald-950/30 border-emerald-500/30 shadow-emerald-950/20 shadow-md ring-1 ring-emerald-500/20'
                    : isDrawer
                    ? 'bg-indigo-950/20 border-indigo-500/30 shadow-indigo-950/10 shadow-md'
                    : isSelf
                    ? 'bg-slate-800/40 border-slate-600/50'
                    : 'bg-slate-800/20 border-slate-800/50 hover:bg-slate-800/30'
                }`}
              >
                {/* Left side: Position, Avatar, Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Position number */}
                  <span className="text-[11px] font-extrabold text-slate-500 w-4 text-center">
                    #{index + 1}
                  </span>

                  {/* Seeded Custom Avatar */}
                  <div
                    style={{ background: avatar.gradient }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm border border-white/10 shrink-0 transform hover:scale-105 transition-all duration-200"
                  >
                    {avatar.character}
                  </div>

                  {/* Name label */}
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-xs font-bold truncate leading-tight ${
                        player.guessedCorrectly
                          ? 'text-emerald-400 font-extrabold'
                          : isSelf
                          ? 'text-slate-100 font-extrabold underline decoration-indigo-400 decoration-2 underline-offset-2'
                          : 'text-slate-300'
                      }`}
                    >
                      {player.name}
                      {isSelf && <span className="text-[10px] text-slate-400 font-normal no-underline"> (You)</span>}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">
                      {player.score} pts
                    </span>
                  </div>
                </div>

                {/* Right side: Status icons */}
                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  {isDrawer && (
                    <div className="bg-indigo-500/20 border border-indigo-500/30 p-1.5 rounded-lg text-indigo-400 animate-pulse" title="Drawing now">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {player.guessedCorrectly && (
                    <div className="bg-emerald-500/20 border border-emerald-500/30 p-1.5 rounded-lg text-emerald-400" title="Guessed correctly">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
export default Scoreboard;
