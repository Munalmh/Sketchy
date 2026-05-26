import React, { useRef, useState, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { Send, MessageSquare } from 'lucide-react';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isDrawer: boolean;
  hasGuessedCorrectly: boolean;
  gamePhase: string;
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  onSendMessage,
  isDrawer,
  hasGuessedCorrectly,
  gamePhase,
}) => {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText);
    setInputText('');
  };

  const getPlaceholderText = () => {
    if (gamePhase !== 'DRAWING') return 'Type a message...';
    if (isDrawer) return "You can't chat while drawing!";
    if (hasGuessedCorrectly) return 'Chat with other winners...';
    return 'Type your guess here...';
  };

  const isInputDisabled = isDrawer && gamePhase === 'DRAWING';

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-700/30 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden">
      
      {/* Title Header */}
      <div className="bg-slate-800/80 px-4 py-3.5 border-b border-slate-700/30 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-indigo-400" />
        <h3 className="font-bold text-sm text-slate-200 tracking-wide uppercase">Game Chat</h3>
      </div>

      {/* Chat Messages Logs */}
      <div className="flex-grow overflow-y-auto p-4 space-y-2.5 max-h-[300px] md:max-h-none scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8 italic">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isWinnerChat = msg.type === 'correct' && msg.sender !== 'System';

            switch (msg.type) {
              case 'system':
                return (
                  <div key={msg.id} className="text-center py-1">
                    <span className="bg-slate-800/50 border border-slate-700/30 text-[10px] text-slate-400 font-bold px-3 py-1 rounded-full">
                      {msg.text}
                    </span>
                  </div>
                );
              case 'correct':
                // Check if it is a system announcement or a green chat message from winner
                if (msg.sender === 'System') {
                  return (
                    <div
                      key={msg.id}
                      className="bg-emerald-950/20 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-1.5 shadow-sm shadow-emerald-950/20"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{msg.text}</span>
                    </div>
                  );
                }
                break;
              case 'close':
                return (
                  <div
                    key={msg.id}
                    className="bg-amber-950/20 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-400 italic"
                  >
                    ⚠️ {msg.text}
                  </div>
                );
            }

            // Default fallback for chat and greenwinner message rendering
            return (
              <div
                key={msg.id}
                className={`text-xs p-2 rounded-xl border transition-all ${
                  isWinnerChat
                    ? 'bg-emerald-950/10 border-emerald-900/30 font-semibold'
                    : 'bg-slate-800/20 border-slate-800/40'
                }`}
              >
                <span
                  className={`font-bold mr-1.5 ${
                    isWinnerChat ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  {msg.sender}:
                </span>
                <span
                  className={
                    isWinnerChat ? 'text-emerald-300/90 font-medium' : 'text-slate-100'
                  }
                >
                  {msg.text}
                </span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-slate-850 border-t border-slate-700/30 flex gap-2 items-center"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isInputDisabled}
          maxLength={80}
          placeholder={getPlaceholderText()}
          className={`flex-grow bg-slate-900 border border-slate-750 px-3 py-2 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
            isInputDisabled ? 'cursor-not-allowed opacity-50 bg-slate-950' : ''
          }`}
        />
        <button
          type="submit"
          disabled={isInputDisabled || !inputText.trim()}
          className={`bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100 ${
            isInputDisabled ? 'bg-slate-800 text-slate-500' : ''
          }`}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

    </div>
  );
};
export default Chat;
