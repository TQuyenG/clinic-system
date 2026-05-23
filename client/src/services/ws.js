// client/src/services/ws.js
// Lightweight WebSocket client for forum real-time updates.

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

let socket = null;
let reconnectTimeout = null;

function getUserId() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id || null;
  } catch (e) {
    return null;
  }
}

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('WS connected to', WS_URL);
    // Register user if available
    const userId = getUserId();
    if (userId) {
      socket.send(JSON.stringify({ type: 'register', payload: { user_id: userId } }));
    }
  };

  socket.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      // Only handle forum_interaction messages here
      if (data && data.type === 'forum_interaction') {
        const event = new CustomEvent('forum:interaction', { detail: data.payload });
        window.dispatchEvent(event);
      }
    } catch (err) {
      console.error('WS message parse error', err);
    }
  };

  socket.onclose = (ev) => {
    console.log('WS closed, will reconnect in 2s', ev.reason);
    socket = null;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(connect, 2000);
  };

  socket.onerror = (err) => {
    console.error('WS error', err);
  };
}

// Auto connect
if (typeof window !== 'undefined') {
  connect();
}

export default {
  connect,
};
