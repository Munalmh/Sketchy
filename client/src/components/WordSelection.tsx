import React from 'react';

interface WordSelectionProps {
  isDrawer: boolean;
  selectableWords: string[];
  timer: number;
  drawerName: string;
  onSelectWord: (word: string) => void;
}

export const WordSelection: React.FC<WordSelectionProps> = ({
  isDrawer,
  selectableWords,
  timer,
  drawerName,
  onSelectWord,
}) => {
  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 rounded-xl border border-slate-700/50 z-20 animate-fade-in">
      
      {isDrawer ? (
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <span className="bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Your Turn!
            </span>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">Choose a Word to Draw</h2>
            <p className="text-xs text-slate-400">
              Select one of the words below. If you don't choose in time, one will be selected automatically.
            </p>
          </div>

          {/* Word Choices Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {selectableWords.map((word) => (
              <button
                key={word}
                onClick={() => onSelectWord(word)}
                className="bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-500/30 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg hover:shadow-indigo-600/25 active:scale-95 transition-all text-sm tracking-wide capitalize"
              >
                {word}
              </button>
            ))}
          </div>

          {/* Timer Display */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest leading-none">Time Remaining</span>
            <span className="text-3xl font-extrabold text-amber-500 tabular-nums animate-pulse mt-1">
              {timer}s
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4 max-w-sm">
          {/* Waiting animation */}
          <div className="flex justify-center items-center gap-1.5 py-4">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-200">Word Selection</h3>
            <p className="text-xs text-slate-400">
              Please wait while <span className="text-indigo-400 font-bold">{drawerName}</span> chooses a word to draw.
            </p>
          </div>

          {/* Countdown indicator */}
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-900/60 border border-slate-800 px-3.5 py-1.5 rounded-full inline-block">
            Timer: <span className="text-amber-500 font-extrabold">{timer}s</span>
          </div>
        </div>
      )}

    </div>
  );
};
export default WordSelection;
