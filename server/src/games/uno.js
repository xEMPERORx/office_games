const { createUnoDeck, shuffle, COLORS } = require('../utils/deck');

function initUnoGame(players) {
  const deck = shuffle(createUnoDeck());
  const hands = {};
  for (const p of players) {
    hands[p] = deck.splice(0, 7);
  }
  // Find a non-special starting card
  let startIdx = deck.findIndex(c => c.color !== 'wild' && !['skip','reverse','draw2'].includes(c.value));
  if (startIdx === -1) startIdx = 0;
  const [startCard] = deck.splice(startIdx, 1);

  return {
    players,
    hands,
    drawPile: deck,
    discardPile: [startCard],
    currentPlayerIndex: 0,
    direction: 1, // 1 = clockwise, -1 = counter
    unoCalledBy: new Set(),
  };
}

function handleUnoEvent(event, state, playerName, data) {
  if (event === 'play_card') return playCard(state, playerName, data);
  if (event === 'draw_card') return drawCard(state, playerName);
  if (event === 'call_uno') { state.unoCalledBy.add(playerName); return {}; }
  return { error: 'Unknown event' };
}

function playCard(state, playerName, { cardId, chosenColor }) {
  if (state.players[state.currentPlayerIndex] !== playerName) return { error: 'Not your turn' };
  const hand = state.hands[playerName];
  const cardIdx = hand.findIndex(c => c.id === cardId);
  if (cardIdx === -1) return { error: 'Card not in hand' };
  const card = hand[cardIdx];
  const topCard = state.discardPile[state.discardPile.length - 1];

  if (!isPlayable(card, topCard)) return { error: 'Card not playable' };

  // Play the card
  hand.splice(cardIdx, 1);
  if (card.color === 'wild' && chosenColor && COLORS.includes(chosenColor)) {
    card.activeColor = chosenColor;
  }
  state.discardPile.push(card);

  // Check win
  if (hand.length === 0) return { winner: playerName };

  // Apply special effects
  applyCardEffect(state, card);
  return {};
}

function drawCard(state, playerName) {
  if (state.players[state.currentPlayerIndex] !== playerName) return { error: 'Not your turn' };
  if (state.drawPile.length === 0) reshuffleDraw(state);
  if (state.drawPile.length === 0) return { error: 'No cards left' };
  state.hands[playerName].push(state.drawPile.pop());
  advanceTurn(state);
  return {};
}

function isPlayable(card, topCard) {
  if (card.color === 'wild') return true;
  if (topCard.activeColor && card.color === topCard.activeColor) return true;
  if (card.color === topCard.color) return true;
  if (card.value === topCard.value) return true;
  return false;
}

function applyCardEffect(state, card) {
  const value = card.value;
  if (value === 'reverse') {
    state.direction *= -1;
    if (state.players.length === 2) { advanceTurn(state); return; }
  }
  if (value === 'skip') { advanceTurn(state); }
  if (value === 'draw2') {
    advanceTurn(state);
    const victim = state.players[state.currentPlayerIndex];
    for (let i = 0; i < 2; i++) {
      if (state.drawPile.length === 0) reshuffleDraw(state);
      if (state.drawPile.length > 0) state.hands[victim].push(state.drawPile.pop());
    }
  }
  if (value === 'wild_draw4') {
    advanceTurn(state);
    const victim = state.players[state.currentPlayerIndex];
    for (let i = 0; i < 4; i++) {
      if (state.drawPile.length === 0) reshuffleDraw(state);
      if (state.drawPile.length > 0) state.hands[victim].push(state.drawPile.pop());
    }
  }
  advanceTurn(state);
}

function advanceTurn(state) {
  state.currentPlayerIndex = (state.currentPlayerIndex + state.direction + state.players.length) % state.players.length;
}

function reshuffleDraw(state) {
  if (state.discardPile.length <= 1) return;
  const top = state.discardPile.pop();
  state.drawPile = shuffle(state.discardPile);
  state.discardPile = [top];
}

module.exports = { initUnoGame, handleUnoEvent };
