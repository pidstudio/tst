import { io } from 'socket.io-client';

// connects to same origin (proxied to backend in dev)
export const socket = io('/', { autoConnect: true });
