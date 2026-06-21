// Ludo - 2-10 players, 4 tokens each
// Players share color teams if >4 players, each still has own tokens

const BOARD_SIZE = 52;
const HOME_COLUMN_LENGTH = 6;
const TOKENS_PER_PLAYER = 4;
const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'lime', 'white'];
const START_POSITIONS = [0, 13, 26, 39, 6, 19, 32, 45, 3, 16]; // 10 entry points
const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47, 6, 19, 32, 45];

function initLudoGame(players) {
  const tokens = {};
  players.forEach((p, i) => {
    tokens[p] = Array.from({ length: TOKENS_PER_PLAYER }, (_, ti) => ({
      id: ti,
      state: 'home',
      position: -1,
    }));
  });

  return {
    players,
    playerColors: Object.fromEntries(players.map((p, i) => [p, PLAYER_COLORS[i % PLAYER_COLORS.length]])),
    startPositions: Object.fromEntries(players.map((p, i) => [p, START_POSITIONS[i % START_POSITIONS.length]])),
    tokens,
    currentPlayerIndex: 0,
    lastRoll: null,
    mustMove: false,
    sixCount: 0,
    winner: null,
  };
}

function handleLudoEvent(event, state, playerName, data) {
  if (state.winner) return { error: 'Game over' };
  if (event === 'roll_dice') return rollDice(state, playerName);
  if (event === 'move_token') return moveToken(state, playerName, data);
  return { error: 'Unknown event' };
}

function rollDice(state, playerName) {
  if (state.players[state.currentPlayerIndex] !== playerName) return { error: 'Not your turn' };
  if (state.mustMove) return { error: 'Must move a token first' };

  const roll = Math.floor(Math.random() * 6) + 1;
  state.lastRoll = roll;

  const playerTokens = state.tokens[playerName];
  const movable = getMovableTokens(playerTokens, roll, playerName, state);

  if (movable.length === 0) {
    if (roll === 6) {
      state.sixCount++;
      if (state.sixCount >= 3) { state.sixCount = 0; advanceTurn(state); }
    } else {
      state.sixCount = 0;
      advanceTurn(state);
    }
    return { rolled: roll, movable: [] };
  }

  state.mustMove = true;
  return { rolled: roll, movable: movable.map(t => t.id) };
}

function moveToken(state, playerName, { tokenId }) {
  if (state.players[state.currentPlayerIndex] !== playerName) return { error: 'Not your turn' };
  if (!state.mustMove) return { error: 'Roll first' };

  const token = state.tokens[playerName][tokenId];
  if (!token) return { error: 'Invalid token' };

  const roll = state.lastRoll;
  const startPos = state.startPositions[playerName];
  let captured = false;

  if (token.state === 'home') {
    if (roll !== 6) return { error: 'Need 6 to leave home' };
    token.state = 'active';
    token.position = startPos;
    captured = checkCapture(state, playerName, token.position);
  } else if (token.state === 'active') {
    const newPos = calculateNewPosition(token.position, roll, startPos);
    if (newPos === null) return { error: 'Cannot move this token' };
    if (newPos >= 100) {
      token.position = newPos;
      if (newPos === 100 + HOME_COLUMN_LENGTH - 1) token.state = 'finished';
    } else {
      token.position = newPos;
      captured = checkCapture(state, playerName, newPos);
    }
  } else {
    return { error: 'Token already finished' };
  }

  state.mustMove = false;

  if (state.tokens[playerName].every(t => t.state === 'finished')) {
    state.winner = playerName;
    return { winner: playerName };
  }

  if (roll === 6 && !captured) {
    state.sixCount++;
    if (state.sixCount >= 3) { state.sixCount = 0; advanceTurn(state); }
  } else {
    state.sixCount = 0;
    if (!captured) advanceTurn(state);
  }

  return {};
}

function calculateNewPosition(currentPos, roll, startPos) {
  const distFromStart = (currentPos - startPos + BOARD_SIZE) % BOARD_SIZE;
  const newDist = distFromStart + roll;
  if (newDist >= BOARD_SIZE) {
    const homeStep = newDist - BOARD_SIZE;
    if (homeStep >= HOME_COLUMN_LENGTH) return null;
    return 100 + homeStep;
  }
  return (currentPos + roll) % BOARD_SIZE;
}

function checkCapture(state, playerName, position) {
  if (SAFE_SQUARES.includes(position)) return false;
  if (position >= 100) return false;
  let captured = false;
  for (const [otherPlayer, tokens] of Object.entries(state.tokens)) {
    if (otherPlayer === playerName) continue;
    for (const t of tokens) {
      if (t.state === 'active' && t.position === position) {
        t.state = 'home';
        t.position = -1;
        captured = true;
      }
    }
  }
  return captured;
}

function getMovableTokens(tokens, roll, playerName, state) {
  const startPos = state.startPositions[playerName];
  return tokens.filter(t => {
    if (t.state === 'finished') return false;
    if (t.state === 'home') return roll === 6;
    const newPos = calculateNewPosition(t.position, roll, startPos);
    return newPos !== null;
  });
}

function advanceTurn(state) {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
}

function getLudoPlayerView(state) {
  return {
    players: state.players,
    playerColors: state.playerColors,
    tokens: state.tokens,
    currentPlayer: state.players[state.currentPlayerIndex],
    lastRoll: state.lastRoll,
    mustMove: state.mustMove,
    winner: state.winner,
  };
}

module.exports = { initLudoGame, handleLudoEvent, getLudoPlayerView };
