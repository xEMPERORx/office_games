const { generateRoomCode } = require('./utils/roomCode');

const rooms = new Map();

function createRoom(playerName, gameType) {
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));

  rooms.set(code, {
    code,
    gameType,
    host: playerName,
    players: [playerName],
    gameState: null,
    started: false,
    createdAt: Date.now(),
  });
  return rooms.get(code);
}

function joinRoom(code, playerName) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.players.includes(playerName)) return { error: 'Name taken' };
  if (room.players.length >= 10) return { error: 'Room full' };
  room.players.push(playerName);
  return room;
}

function leaveRoom(code, playerName) {
  const room = rooms.get(code);
  if (!room) return;
  room.players = room.players.filter(p => p !== playerName);
  if (room.players.length === 0) {
    rooms.delete(code);
    return null;
  }
  if (room.host === playerName) room.host = room.players[0];
  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function getAllRooms() {
  return rooms;
}

module.exports = { createRoom, joinRoom, leaveRoom, getRoom, getAllRooms };
