const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createRoom, joinRoom, leaveRoom, getRoom, getAllRooms } = require('./roomManager');
const { initUnoGame, handleUnoEvent } = require('./games/uno');
const { initLudoGame, handleLudoEvent, getLudoPlayerView } = require('./games/ludo');
const { initTeenPattiGame, handleTeenPattiEvent, getTeenPattiPlayerView } = require('./games/teenpatti');
const { initNapoleonGame, handleNapoleonEvent, getNapoleonPlayerView } = require('./games/napoleon');
const { initEKGame, handleEKEvent, getEKPlayerView } = require('./games/explodingkittens');
const { initNapoleonWordGame, handleNapoleonWordEvent, getNapoleonWordPlayerView } = require('./games/napoleonword');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, '../public')));

const socketMeta = new Map();
const turnTimers = new Map(); // roomCode -> { timer, endTime }
const scoreboards = new Map(); // roomCode -> { player: wins }
const disconnectedPlayers = new Map(); // roomCode:playerName -> { timeout, socketId }

const TURN_TIME = 30000; // 30 seconds

// --- Helpers ---
function broadcastState(roomCode, room) {
  for (const [sid, m] of socketMeta) {
    if (m.roomCode !== roomCode) continue;
    const view = getPlayerView(room, m.playerName);
    if (view) io.to(sid).emit('game_state_update', view);
  }
}

function broadcastLog(roomCode, message) {
  io.to(roomCode).emit('game_log', message);
}

function getPlayerView(room, playerName) {
  const gs = room.gameState;
  if (!gs) return null;
  switch (room.gameType) {
    case 'uno': return getUnoPlayerView(gs, playerName);
    case 'ludo': return getLudoPlayerView(gs);
    case 'teenpatti': return getTeenPattiPlayerView(gs, playerName);
    case 'napoleon': return getNapoleonPlayerView(gs, playerName);
    case 'explodingkittens': return getEKPlayerView(gs, playerName);
    case 'napoleonword': return getNapoleonWordPlayerView(gs, playerName);
    default: return null;
  }
}

function initGame(room) {
  switch (room.gameType) {
    case 'uno': return initUnoGame(room.players.filter(p => !room.spectators?.includes(p)));
    case 'ludo': return initLudoGame(room.players.filter(p => !room.spectators?.includes(p)));
    case 'teenpatti': return initTeenPattiGame(room.players.filter(p => !room.spectators?.includes(p)));
    case 'napoleon': return initNapoleonGame(room.players.filter(p => !room.spectators?.includes(p)));
    case 'explodingkittens': return initEKGame(room.players.filter(p => !room.spectators?.includes(p)));
    case 'napoleonword': return initNapoleonWordGame(room.players.filter(p => !room.spectators?.includes(p)));
    default: return null;
  }
}

function getUnoPlayerView(gs, playerName) {
  return {
    hand: gs.hands[playerName] || [],
    topCard: gs.discardPile[gs.discardPile.length - 1],
    currentPlayer: gs.players[gs.currentPlayerIndex],
    direction: gs.direction,
    handCounts: Object.fromEntries(Object.entries(gs.hands).map(([p, h]) => [p, h.length])),
    players: gs.players,
  };
}

function getCurrentPlayer(room) {
  const gs = room.gameState;
  if (!gs) return null;
  if (room.gameType === 'uno') return gs.players[gs.currentPlayerIndex];
  if (room.gameType === 'ludo') return gs.players[gs.currentPlayerIndex];
  if (room.gameType === 'teenpatti') return gs.activePlayers[gs.currentPlayerIndex % gs.activePlayers.length];
  if (room.gameType === 'napoleon') return gs.phase === 'bidding' ? gs.players[gs.currentBidderIndex] : gs.players[gs.currentPlayerIndex];
  if (room.gameType === 'explodingkittens') return gs.alivePlayers[gs.currentPlayerIndex];
  return null;
}

// --- Turn Timer ---
function startTurnTimer(roomCode) {
  clearTurnTimer(roomCode);
  const endTime = Date.now() + TURN_TIME;
  io.to(roomCode).emit('turn_timer', { endTime, duration: TURN_TIME });

  const timer = setTimeout(() => {
    autoSkipTurn(roomCode);
  }, TURN_TIME);
  turnTimers.set(roomCode, { timer, endTime });
}

function clearTurnTimer(roomCode) {
  const existing = turnTimers.get(roomCode);
  if (existing) { clearTimeout(existing.timer); turnTimers.delete(roomCode); }
}

function autoSkipTurn(roomCode) {
  const room = getRoom(roomCode);
  if (!room || !room.gameState) return;
  const current = getCurrentPlayer(room);
  if (!current) return;

  // Auto-action based on game type
  if (room.gameType === 'uno') {
    handleUnoEvent('draw_card', room.gameState, current, {});
  } else if (room.gameType === 'ludo') {
    if (!room.gameState.mustMove) handleLudoEvent('roll_dice', room.gameState, current, {});
    // If must move, pick first movable token
    if (room.gameState.mustMove) {
      const tokens = room.gameState.tokens[current];
      const movable = tokens.find(t => t.state !== 'finished');
      if (movable) handleLudoEvent('move_token', room.gameState, current, { tokenId: movable.id });
    }
  } else if (room.gameType === 'teenpatti') {
    handleTeenPattiEvent('tp_fold', room.gameState, current, {});
  } else if (room.gameType === 'napoleon') {
    if (room.gameState.phase === 'bidding') handleNapoleonEvent('nap_pass', room.gameState, current, {});
  } else if (room.gameType === 'explodingkittens') {
    handleEKEvent('ek_draw_card', room.gameState, current, {});
  }

  broadcastLog(roomCode, `⏰ ${current} timed out`);
  broadcastState(roomCode, room);
  startTurnTimer(roomCode);
}

// --- Room persistence (5 min cleanup) ---
function scheduleRoomCleanup(roomCode) {
  const room = getRoom(roomCode);
  if (!room) return;
  if (room._cleanupTimer) clearTimeout(room._cleanupTimer);
  room._cleanupTimer = setTimeout(() => {
    const r = getRoom(roomCode);
    if (r && r.players.length === 0) {
      leaveRoom(roomCode, null); // force delete
      turnTimers.delete(roomCode);
      scoreboards.delete(roomCode);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// --- AI Bot ---
function createBotName() {
  const names = ['Bot_Alpha', 'Bot_Beta', 'Bot_Gamma', 'Bot_Delta', 'Bot_Omega', 'Bot_Sigma', 'Bot_Zeta'];
  return names[Math.floor(Math.random() * names.length)] + '_' + Math.floor(Math.random() * 99);
}

function botPlay(roomCode, botName) {
  const room = getRoom(roomCode);
  if (!room || !room.gameState) return;
  const current = getCurrentPlayer(room);
  if (current !== botName) return;

  setTimeout(() => {
    const rm = getRoom(roomCode);
    if (!rm || !rm.gameState) return;
    const curr = getCurrentPlayer(rm);
    if (curr !== botName) return;

    let result = {};
    if (rm.gameType === 'uno') {
      const gs = rm.gameState;
      const hand = gs.hands[botName];
      const top = gs.discardPile[gs.discardPile.length - 1];
      const playable = hand.find(c => c.color === 'wild' || c.color === top.color || c.color === (top.activeColor || top.color) || c.value === top.value);
      if (playable) {
        const data = { cardId: playable.id };
        if (playable.color === 'wild') data.chosenColor = ['red','blue','green','yellow'][Math.floor(Math.random()*4)];
        result = handleUnoEvent('play_card', gs, botName, data);
      } else {
        result = handleUnoEvent('draw_card', gs, botName, {});
      }
    } else if (rm.gameType === 'teenpatti') {
      const gs = rm.gameState;
      if (gs.status[botName] === 'blind') {
        result = handleTeenPattiEvent('tp_bet', gs, botName, { amount: gs.currentBet });
      } else {
        result = handleTeenPattiEvent('tp_bet', gs, botName, { amount: gs.currentBet * 2 });
      }
    } else if (rm.gameType === 'ludo') {
      const gs = rm.gameState;
      if (!gs.mustMove) {
        result = handleLudoEvent('roll_dice', gs, botName, {});
        if (gs.mustMove) {
          const tok = gs.tokens[botName].find(t => t.state !== 'finished');
          if (tok) handleLudoEvent('move_token', gs, botName, { tokenId: tok.id });
        }
      }
    } else if (rm.gameType === 'explodingkittens') {
      result = handleEKEvent('ek_draw_card', rm.gameState, botName, {});
    } else if (rm.gameType === 'napoleon') {
      if (rm.gameState.phase === 'bidding') {
        result = handleNapoleonEvent('nap_pass', rm.gameState, botName, {});
      } else if (rm.gameState.phase === 'playing') {
        const hand = rm.gameState.hands[botName];
        if (hand && hand.length > 0) result = handleNapoleonEvent('nap_play_card', rm.gameState, botName, { cardId: hand[0].id });
      }
    }

    broadcastState(roomCode, rm);
    if (result.winner) {
      io.to(roomCode).emit('game_over', { winner: result.winner });
      updateScoreboard(roomCode, result.winner);
    }

    // If still bot's turn after action, play again
    const nextCurrent = getCurrentPlayer(rm);
    if (nextCurrent === botName && rm.gameState) {
      botPlay(roomCode, botName);
    } else {
      startTurnTimer(roomCode);
    }
  }, 1000 + Math.random() * 1500);
}

function updateScoreboard(roomCode, winner) {
  if (!scoreboards.has(roomCode)) scoreboards.set(roomCode, {});
  const sb = scoreboards.get(roomCode);
  sb[winner] = (sb[winner] || 0) + 1;
  io.to(roomCode).emit('scoreboard_update', sb);

  // Auto-start next round after 5 seconds
  setTimeout(() => {
    const room = getRoom(roomCode);
    if (!room || !room.started) return;

    // Preserve chips for chip-based games
    let prevChips = null;
    if (room.gameType === 'teenpatti' && room.gameState) {
      prevChips = room.gameState.chips;
    }

    const activePlayers = room.players.filter(p => !room.spectators?.includes(p));
    if (room.gameType === 'teenpatti') {
      room.gameState = initTeenPattiGame(activePlayers, prevChips);
    } else {
      room.gameState = initGame(room);
    }
    if (!room.gameState) return;
    broadcastLog(roomCode, '🔄 New round starting!');
    broadcastState(roomCode, room);
    io.to(roomCode).emit('round_start');
    startTurnTimer(roomCode);
    const current = getCurrentPlayer(room);
    if (current && room.bots && room.bots.includes(current)) botPlay(roomCode, current);
  }, 5000);
}

// --- Socket handlers ---
io.on('connection', (socket) => {
  socket.on('create_room', ({ playerName, gameType }, cb) => {
    const room = createRoom(playerName, gameType);
    room.spectators = [];
    socket.join(room.code);
    socketMeta.set(socket.id, { roomCode: room.code, playerName });
    scoreboards.set(room.code, {});
    cb({ roomCode: room.code, players: room.players, gameType: room.gameType });
  });

  socket.on('join_room', ({ roomCode, playerName, spectate }, cb) => {
    const room = getRoom(roomCode);
    // Reconnection check
    const dcKey = `${roomCode}:${playerName}`;
    if (disconnectedPlayers.has(dcKey)) {
      const dc = disconnectedPlayers.get(dcKey);
      clearTimeout(dc.timeout);
      disconnectedPlayers.delete(dcKey);
      socket.join(roomCode);
      socketMeta.set(socket.id, { roomCode, playerName });
      const view = room && room.gameState ? getPlayerView(room, playerName) : null;
      cb({ roomCode, players: room.players, gameType: room.gameType, gameState: view, reconnected: true, scoreboard: scoreboards.get(roomCode) });
      return;
    }

    const result = joinRoom(roomCode, playerName);
    if (result.error) return cb({ error: result.error });
    socket.join(roomCode);
    socketMeta.set(socket.id, { roomCode, playerName });

    if (spectate && room) {
      if (!room.spectators) room.spectators = [];
      room.spectators.push(playerName);
    }

    socket.to(roomCode).emit('player_joined', { playerName, players: result.players });
    cb({ roomCode, players: result.players, gameType: result.gameType, scoreboard: scoreboards.get(roomCode) });
  });

  socket.on('chat_message', ({ message }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    io.to(meta.roomCode).emit('chat_message', { playerName: meta.playerName, message, timestamp: Date.now() });
  });

  socket.on('start_game', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = getRoom(meta.roomCode);
    if (!room || room.host !== meta.playerName) return;
    room.started = true;
    room.gameState = initGame(room);
    if (!room.gameState) {
      room.started = false;
      return socket.emit('game_error', 'Failed to initialize game (need at least 2 players)');
    }
    for (const [sid, m] of socketMeta) {
      if (m.roomCode === meta.roomCode) {
        io.to(sid).emit('game_started', getPlayerView(room, m.playerName));
      }
    }
    broadcastLog(meta.roomCode, '🎮 Game started!');
    startTurnTimer(meta.roomCode);

    // If first player is a bot, trigger bot play
    const current = getCurrentPlayer(room);
    if (current && room.bots && room.bots.includes(current)) botPlay(meta.roomCode, current);
  });

  // --- UNO events ---
  socket.on('play_card', (data) => handleGameEvent(socket, 'uno', (room, meta) => {
    const result = handleUnoEvent('play_card', room.gameState, meta.playerName, data);
    if (result.error) return { error: result.error };
    broadcastLog(meta.roomCode, `🃏 ${meta.playerName} played a card`);
    if (result.winner) { io.to(meta.roomCode).emit('game_over', { winner: result.winner }); updateScoreboard(meta.roomCode, result.winner); clearTurnTimer(meta.roomCode); }
    return result;
  }));

  socket.on('draw_card', () => handleGameEvent(socket, 'uno', (room, meta) => {
    const result = handleUnoEvent('draw_card', room.gameState, meta.playerName, {});
    if (result.error) return { error: result.error };
    broadcastLog(meta.roomCode, `📥 ${meta.playerName} drew a card`);
    return result;
  }));

  socket.on('call_uno', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = getRoom(meta.roomCode);
    if (!room?.gameState || room.gameType !== 'uno') return;
    handleUnoEvent('call_uno', room.gameState, meta.playerName, {});
    broadcastLog(meta.roomCode, `🔥 ${meta.playerName} called UNO!`);
    io.to(meta.roomCode).emit('uno_called', { player: meta.playerName });
  });

  // --- Ludo events ---
  socket.on('roll_dice', () => handleGameEvent(socket, 'ludo', (room, meta) => {
    const result = handleLudoEvent('roll_dice', room.gameState, meta.playerName, {});
    if (result.error) return { error: result.error };
    broadcastLog(meta.roomCode, `🎲 ${meta.playerName} rolled ${result.rolled}`);
    return result;
  }));

  socket.on('move_token', (data) => handleGameEvent(socket, 'ludo', (room, meta) => {
    const result = handleLudoEvent('move_token', room.gameState, meta.playerName, data);
    if (result.error) return { error: result.error };
    if (result.winner) { io.to(meta.roomCode).emit('game_over', { winner: result.winner }); updateScoreboard(meta.roomCode, result.winner); clearTurnTimer(meta.roomCode); }
    return result;
  }));

  // --- Teen Patti events ---
  ['tp_see', 'tp_bet', 'tp_fold', 'tp_show'].forEach(evt => {
    socket.on(evt, (data) => handleGameEvent(socket, 'teenpatti', (room, meta) => {
      const result = handleTeenPattiEvent(evt, room.gameState, meta.playerName, data || {});
      if (result.error) return { error: result.error };
      if (evt === 'tp_fold') broadcastLog(meta.roomCode, `💀 ${meta.playerName} folded`);
      if (evt === 'tp_bet') broadcastLog(meta.roomCode, `💰 ${meta.playerName} bet ${data?.amount || ''}`);
      if (result.winner) { io.to(meta.roomCode).emit('game_over', { winner: result.winner }); updateScoreboard(meta.roomCode, result.winner); clearTurnTimer(meta.roomCode); }
      return result;
    }));
  });

  // --- Napoleon events ---
  ['nap_bid', 'nap_pass', 'nap_pick_ally', 'nap_play_card'].forEach(evt => {
    socket.on(evt, (data) => handleGameEvent(socket, 'napoleon', (room, meta) => {
      const result = handleNapoleonEvent(evt, room.gameState, meta.playerName, data || {});
      if (result.error) return { error: result.error };
      if (evt === 'nap_bid') broadcastLog(meta.roomCode, `👑 ${meta.playerName} bid ${data?.amount}`);
      if (evt === 'nap_pass') broadcastLog(meta.roomCode, `⏭️ ${meta.playerName} passed`);
      if (result.winner) { io.to(meta.roomCode).emit('game_over', { winner: result.winner }); updateScoreboard(meta.roomCode, result.winner); clearTurnTimer(meta.roomCode); }
      return result;
    }));
  });

  // --- Exploding Kittens events ---
  ['ek_play_card', 'ek_draw_card', 'ek_defuse', 'ek_give_favor'].forEach(evt => {
    socket.on(evt, (data) => handleGameEvent(socket, 'explodingkittens', (room, meta) => {
      const result = handleEKEvent(evt, room.gameState, meta.playerName, data || {});
      if (result.error) return { error: result.error };
      if (result.seeFuture) socket.emit('ek_see_future', { cards: result.seeFuture });
      if (result.eliminated) { io.to(meta.roomCode).emit('ek_player_eliminated', { player: result.eliminated }); broadcastLog(meta.roomCode, `💀 ${result.eliminated} exploded!`); }
      if (result.winner) { io.to(meta.roomCode).emit('game_over', { winner: result.winner }); updateScoreboard(meta.roomCode, result.winner); clearTurnTimer(meta.roomCode); }
      return result;
    }));
  });

  // --- Napoleon Word Game events ---
  ['nw_submit', 'nw_guess', 'nw_set_category'].forEach(evt => {
    socket.on(evt, (data) => handleGameEvent(socket, 'napoleonword', (room, meta) => {
      const result = handleNapoleonWordEvent(evt, room.gameState, meta.playerName, data || {});
      if (result.error) return { error: result.error };
      if (evt === 'nw_guess' && data?.guessedPlayer) broadcastLog(meta.roomCode, `🔤 ${meta.playerName} guessed "${data.word}" → ${data.guessedPlayer}`);
      if (result.winner) { io.to(meta.roomCode).emit('game_over', { winner: result.winner }); updateScoreboard(meta.roomCode, result.winner); clearTurnTimer(meta.roomCode); }
      return result;
    }));
  });

  // --- Emoji reactions ---
  socket.on('emoji_reaction', ({ emoji }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    io.to(meta.roomCode).emit('emoji_reaction', { player: meta.playerName, emoji });
  });

  // --- Restart ---
  socket.on('restart_game', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = getRoom(meta.roomCode);
    if (!room || room.host !== meta.playerName) return;
    clearTurnTimer(meta.roomCode);
    room.gameState = initGame(room);
    broadcastState(meta.roomCode, room);
    broadcastLog(meta.roomCode, '🔄 Game restarted');
    startTurnTimer(meta.roomCode);
    const current = getCurrentPlayer(room);
    if (current && room.bots && room.bots.includes(current)) botPlay(meta.roomCode, current);
  });

  // --- Add Bot ---
  socket.on('add_bot', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = getRoom(meta.roomCode);
    if (!room || room.host !== meta.playerName) return;
    if (room.players.length >= 10) return socket.emit('game_error', 'Room full');
    const botName = createBotName();
    room.players.push(botName);
    if (!room.bots) room.bots = [];
    room.bots.push(botName);
    io.to(meta.roomCode).emit('player_joined', { playerName: botName, players: room.players });
  });

  // --- Game Switching ---
  socket.on('vote_switch', ({ gameType }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = getRoom(meta.roomCode);
    if (!room) return;
    if (!room.switchVotes) room.switchVotes = {};
    room.switchVotes[meta.playerName] = gameType;
    const votes = Object.values(room.switchVotes);
    const needed = Math.ceil(room.players.length / 2);
    const topVote = votes.sort((a, b) => votes.filter(v => v === b).length - votes.filter(v => v === a).length)[0];
    const topCount = votes.filter(v => v === topVote).length;

    io.to(meta.roomCode).emit('switch_votes', { votes: room.switchVotes, needed });

    if (topCount >= needed) {
      room.gameType = topVote;
      room.switchVotes = {};
      room.gameState = null;
      room.started = false;
      clearTurnTimer(meta.roomCode);
      io.to(meta.roomCode).emit('game_switched', { gameType: topVote });
      broadcastLog(meta.roomCode, `🔀 Game switched to ${topVote}`);
    }
  });

  // --- Leave ---
  socket.on('leave_room', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    socket.leave(meta.roomCode);
    const room = leaveRoom(meta.roomCode, meta.playerName);
    if (room) {
      io.to(meta.roomCode).emit('player_left', { playerName: meta.playerName, players: room.players });
      if (room.players.length === 0) scheduleRoomCleanup(meta.roomCode);
    }
    socketMeta.delete(socket.id);
    socket.emit('left_room');
  });

  // --- Disconnect (with reconnection window) ---
  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = getRoom(meta.roomCode);

    // Give 60s to reconnect if game is active
    if (room && room.started) {
      const dcKey = `${meta.roomCode}:${meta.playerName}`;
      const timeout = setTimeout(() => {
        disconnectedPlayers.delete(dcKey);
        const r = getRoom(meta.roomCode);
        if (r) {
          leaveRoom(meta.roomCode, meta.playerName);
          io.to(meta.roomCode).emit('player_left', { playerName: meta.playerName, players: r.players });
          if (r.players.length === 0) scheduleRoomCleanup(meta.roomCode);
        }
      }, 60000);
      disconnectedPlayers.set(dcKey, { timeout, socketId: socket.id });
      io.to(meta.roomCode).emit('player_disconnected', { playerName: meta.playerName });
    } else {
      if (room) {
        leaveRoom(meta.roomCode, meta.playerName);
        io.to(meta.roomCode).emit('player_left', { playerName: meta.playerName, players: room.players });
        if (room.players.length === 0) scheduleRoomCleanup(meta.roomCode);
      }
    }
    socketMeta.delete(socket.id);
  });

  // --- Scoreboard request ---
  socket.on('get_scoreboard', (_, cb) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    cb(scoreboards.get(meta.roomCode) || {});
  });
});

function handleGameEvent(socket, gameType, handler) {
  const meta = socketMeta.get(socket.id);
  if (!meta) return;
  const room = getRoom(meta.roomCode);
  if (!room?.gameState || room.gameType !== gameType) return;

  const result = handler(room, meta);
  if (result?.error) return socket.emit('game_error', result.error);
  broadcastState(meta.roomCode, room);

  // Restart turn timer & trigger bot if needed
  if (!result?.winner) {
    startTurnTimer(meta.roomCode);
    const current = getCurrentPlayer(room);
    if (current && room.bots && room.bots.includes(current)) botPlay(meta.roomCode, current);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
