import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) return;
    const s = io({ reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000 });
    ref.current = s;
    setSocket(s);
    return () => { s.disconnect(); ref.current = null; };
  }, []);

  return socket;
}
