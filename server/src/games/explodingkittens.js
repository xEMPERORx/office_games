// Exploding Kittens - 2-5 players, last one standing wins
const { shuffle } = require('../utils/deck');

const CARD_TYPES = {
  EXPLODING_KITTEN: 'exploding_kitten',
  DEFUSE: 'defuse',
  ATTACK: 'attack',
  SKIP: 'skip',
  FAVOR: 'favor',
  SHUFFLE: 'shuffle',
  SEE_FUTURE: 'see_future',
  NOPE: 'nope',
  CAT_1: 'cat_taco',
  CAT_2: 'cat_melon',
  CAT_3: 'cat_potato',
  CAT_4: 'cat_beard',
  CAT_5: 'cat_rainbow',
};

function createEKDeck(playerCount) {
  let id = 0;
  const deck = [];
  const add = (type, count) => { for (let i = 0; i < count; i++) deck.push({ id: id++, type }); };

  // Scale card counts for larger games
  const scale = Math.ceil(playerCount / 5);
  add(CARD_TYPES.DEFUSE, 2 + playerCount); // enough defuses
  add(CARD_TYPES.ATTACK, 4 * scale);
  add(CARD_TYPES.SKIP, 4 * scale);
  add(CARD_TYPES.FAVOR, 4 * scale);
  add(CARD_TYPES.SHUFFLE, 4 * scale);
  add(CARD_TYPES.SEE_FUTURE, 5 * scale);
  add(CARD_TYPES.NOPE, 5 * scale);
  add(CARD_TYPES.CAT_1, 4 * scale);
  add(CARD_TYPES.CAT_2, 4 * scale);
  add(CARD_TYPES.CAT_3, 4 * scale);
  add(CARD_TYPES.CAT_4, 4 * scale);
  add(CARD_TYPES.CAT_5, 4 * scale);

  return { deck, bombs: playerCount - 1, id };
}

function initEKGame(players) {
  const { deck, bombs, id } = createEKDeck(players.length);
  let nextId = id;
  const shuffled = shuffle(deck);
  const hands = {};

  // Deal 7 cards each (defuse already in deck, player gets one guaranteed)
  for (const p of players) {
    hands[p] = shuffled.splice(0, 7);
    // Ensure each player has at least 1 defuse
    if (!hands[p].some(c => c.type === CARD_TYPES.DEFUSE)) {
      hands[p].push({ id: nextId++, type: CARD_TYPES.DEFUSE });
    }
  }

  // Insert exploding kittens into remaining deck
  for (let i = 0; i < bombs; i++) {
    shuffled.push({ id: nextId++, type: CARD_TYPES.EXPLODING_KITTEN });
  }

  return {
    players,
    hands,
    drawPile: shuffle(shuffled),
    discardPile: [],
    currentPlayerIndex: 0,
    alivePlayers: [...players],
    turnsRemaining: 1, // Attack stacks turns
    winner: null,
    pendingAction: null, // { type: 'defuse', player } or { type: 'favor', from, to } or { type: 'nope_window', action, player, timeout }
    lastAction: null,
  };
}

function handleEKEvent(event, state, playerName, data) {
  if (state.winner) return { error: 'Game over' };
  if (!state.alivePlayers.includes(playerName)) return { error: 'You are eliminated' };

  switch (event) {
    case 'ek_play_card': return playCard(state, playerName, data);
    case 'ek_draw_card': return drawCard(state, playerName);
    case 'ek_defuse': return defuse(state, playerName, data);
    case 'ek_give_favor': return giveFavor(state, playerName, data);
    default: return { error: 'Unknown event' };
  }
}

function playCard(state, playerName, { cardId, targetPlayerId, cardId2 }) {
  const currentPlayer = state.alivePlayers[state.currentPlayerIndex];
  // Only current player can play (except nope is not implemented as interrupt for simplicity)
  if (playerName !== currentPlayer) return { error: 'Not your turn' };
  if (state.pendingAction) return { error: 'Resolve pending action first' };

  const hand = state.hands[playerName];
  const idx = hand.findIndex(c => c.id === cardId);
  if (idx === -1) return { error: 'Card not in hand' };
  const card = hand[idx];

  // Cat pair: steal random card from target
  if (card.type.startsWith('cat_')) {
    const idx2 = cardId2 != null ? hand.findIndex(c => c.id === cardId2 && c.type === card.type && c.id !== cardId) : -1;
    if (idx2 === -1) return { error: 'Need a pair of same cat cards' };
    if (!targetPlayerId || !state.alivePlayers.includes(targetPlayerId) || targetPlayerId === playerName) return { error: 'Invalid target' };
    hand.splice(idx, 1);
    hand.splice(hand.findIndex(c => c.id === cardId2), 1);
    state.discardPile.push(card, hand.find(c => c.id === cardId2) || card);
    // Steal random card
    const targetHand = state.hands[targetPlayerId];
    if (targetHand.length > 0) {
      const stolen = targetHand.splice(Math.floor(Math.random() * targetHand.length), 1)[0];
      hand.push(stolen);
    }
    state.lastAction = { type: 'cat_steal', player: playerName, target: targetPlayerId };
    return {};
  }

  hand.splice(idx, 1);
  state.discardPile.push(card);

  switch (card.type) {
    case CARD_TYPES.ATTACK:
      state.turnsRemaining = 0;
      advanceTurn(state);
      state.turnsRemaining = 2;
      state.lastAction = { type: 'attack', player: playerName };
      return {};

    case CARD_TYPES.SKIP:
      state.turnsRemaining--;
      if (state.turnsRemaining <= 0) advanceTurn(state);
      state.lastAction = { type: 'skip', player: playerName };
      return {};

    case CARD_TYPES.FAVOR:
      if (!targetPlayerId || !state.alivePlayers.includes(targetPlayerId) || targetPlayerId === playerName) return { error: 'Invalid target' };
      state.pendingAction = { type: 'favor', from: targetPlayerId, to: playerName };
      state.lastAction = { type: 'favor', player: playerName, target: targetPlayerId };
      return { favor: { from: targetPlayerId } };

    case CARD_TYPES.SHUFFLE:
      state.drawPile = shuffle(state.drawPile);
      state.lastAction = { type: 'shuffle', player: playerName };
      return {};

    case CARD_TYPES.SEE_FUTURE:
      state.lastAction = { type: 'see_future', player: playerName };
      return { seeFuture: state.drawPile.slice(-3).reverse() };

    default:
      return { error: 'Cannot play this card' };
  }
}

function drawCard(state, playerName) {
  const currentPlayer = state.alivePlayers[state.currentPlayerIndex];
  if (playerName !== currentPlayer) return { error: 'Not your turn' };
  if (state.pendingAction) return { error: 'Resolve pending action first' };
  if (state.drawPile.length === 0) return { error: 'No cards' };

  const card = state.drawPile.pop();

  if (card.type === CARD_TYPES.EXPLODING_KITTEN) {
    // Check for defuse
    const defuseIdx = state.hands[playerName].findIndex(c => c.type === CARD_TYPES.DEFUSE);
    if (defuseIdx !== -1) {
      state.pendingAction = { type: 'defuse', player: playerName, bomb: card };
      return { exploded: true, hasDefuse: true };
    }
    // Eliminated
    state.alivePlayers = state.alivePlayers.filter(p => p !== playerName);
    if (state.currentPlayerIndex >= state.alivePlayers.length) state.currentPlayerIndex = 0;
    state.turnsRemaining = 1;
    if (state.alivePlayers.length === 1) {
      state.winner = state.alivePlayers[0];
      return { eliminated: playerName, winner: state.winner };
    }
    return { eliminated: playerName };
  }

  state.hands[playerName].push(card);
  state.turnsRemaining--;
  if (state.turnsRemaining <= 0) advanceTurn(state);
  return { drewCard: card };
}

function defuse(state, playerName, { insertPosition }) {
  if (!state.pendingAction || state.pendingAction.type !== 'defuse' || state.pendingAction.player !== playerName) return { error: 'No defuse pending' };

  const hand = state.hands[playerName];
  const defuseIdx = hand.findIndex(c => c.type === CARD_TYPES.DEFUSE);
  if (defuseIdx === -1) return { error: 'No defuse card' };

  // Remove defuse from hand, discard it
  const defuseCard = hand.splice(defuseIdx, 1)[0];
  state.discardPile.push(defuseCard);

  // Reinsert bomb
  const pos = Math.max(0, Math.min(insertPosition || 0, state.drawPile.length));
  state.drawPile.splice(pos, 0, state.pendingAction.bomb);

  state.pendingAction = null;
  state.turnsRemaining--;
  if (state.turnsRemaining <= 0) advanceTurn(state);
  return {};
}

function giveFavor(state, playerName, { cardId }) {
  if (!state.pendingAction || state.pendingAction.type !== 'favor' || state.pendingAction.from !== playerName) return { error: 'Not your favor to give' };

  const hand = state.hands[playerName];
  const idx = hand.findIndex(c => c.id === cardId);
  if (idx === -1) return { error: 'Card not in hand' };

  const card = hand.splice(idx, 1)[0];
  state.hands[state.pendingAction.to].push(card);
  state.pendingAction = null;
  return {};
}

function advanceTurn(state) {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.alivePlayers.length;
  state.turnsRemaining = 1;
}

function getEKPlayerView(state, playerName) {
  return {
    players: state.players,
    hand: state.hands[playerName] || [],
    deckSize: state.drawPile.length,
    discardTop: state.discardPile[state.discardPile.length - 1] || null,
    currentPlayer: state.alivePlayers[state.currentPlayerIndex],
    alivePlayers: state.alivePlayers,
    handCounts: Object.fromEntries(state.alivePlayers.map(p => [p, (state.hands[p] || []).length])),
    turnsRemaining: state.turnsRemaining,
    winner: state.winner,
    pendingAction: state.pendingAction ? { type: state.pendingAction.type, from: state.pendingAction.from, to: state.pendingAction.to } : null,
    lastAction: state.lastAction,
  };
}

module.exports = { initEKGame, handleEKEvent, getEKPlayerView };
