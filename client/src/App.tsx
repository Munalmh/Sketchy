import { useState, useEffect } from 'react';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';

function App() {
  const [view, setView] = useState<'lobby' | 'game'>('lobby');
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');

  // Extract room ID from URL parameters if available (for easy share invites)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      // Normalize
      const cleanRoom = roomParam.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (cleanRoom) {
        setRoomId(cleanRoom);
      }
    }
  }, []);

  const handleJoinRoom = (name: string, room: string, avatar: string) => {
    setUsername(name);
    setRoomId(room);
    setAvatarSeed(avatar);
    setView('game');

    // Update query params to support sharing links
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${room}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleLeaveRoom = () => {
    setView('lobby');
    setRoomId('');
    setUsername('');
    setAvatarSeed('');

    // Clear query parameter
    const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {view === 'lobby' ? (
        <Lobby onJoinRoom={handleJoinRoom} initialRoomId={roomId} />
      ) : (
        <GameRoom
          roomId={roomId}
          username={username}
          avatarSeed={avatarSeed}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;
