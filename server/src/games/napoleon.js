// Napoleon - Trick-taking card game (4-5 players)
// 32-card deck (7-A in 4 suits), bidding phase, Napoleon picks ally

const { shuffle } = require('../utils/deck');

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const VALUE_RANK = { '2':0, '3':1, '4':2, '5':3, '6':4, '7':5, '8':6, '9':7, '10':8, 'J':9, 'Q':10, 'K':11, 'A':12 };

function createNapoleonDeck() {
  let id = 0;
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ id: id++, suit, value, rank: VALUE_RANK[value] });
    }
  }
  return deck;
}

function initNapoleonGame(players) {
  const deck = shuffle(createNapoleonDeck());
  const hands = {};
  const cardsPerPlayer = Math.floor(32 / players.length);
  for (const p of players) {
    hands[p] = deck.splice(0, cardsPerPlayer);
  }

  return {
    players,
    hands,
    phase: 'bidding', // bidding | pickAlly | playing
    bids: {},
    currentBidderIndex: 0,
    napoleon: null,
    ally: null, // ally card (whoever holds it is the ally)
    allyPlayer: null,
    trumpSuit: null,
    bidAmount: 0,
    tricks: Object.fromEntries(players.map(p => [p, 0])),
    currentTrick: [],
    leadSuit: null,
    currentPlayerIndex: 0,
    tricksPlayed: 0,
    winner: null,
    passedPlayers: [],
  };
}

function handleNapoleonEvent(event, state, playerName, data) {
  if (state.winner) return { error: 'Game over' };
  switch (event) {
    case 'nap_bid': return placeBid(state, playerName, data);
    case 'nap_pass': return passBid(state, playerName);
    case 'nap_pick_ally': return pickAlly(state, playerName, data);
    case 'nap_play_card': return playCard(state, playerName, data);
    default: return { error: 'Unknown event' };
  }
}

function placeBid(state, playerName, { amount, trumpSuit }) {
  if (state.phase !== 'bidding') return { error: 'Not bidding phase' };
  if (state.players[state.currentBidderIndex] !== playerName) return { error: 'Not your turn to bid' };
  if (amount <= state.bidAmount) return { error: 'Bid too low' };
  if (amount > Math.floor(32 / state.players.length)) return { error: 'Bid too high' };
  if (!SUITS.includes(trumpSuit)) return { error: 'Invalid trump suit' };

  state.bids[playerName] = amount;
  state.bidAmount = amount;
  state.napoleon = playerName;
  state.trumpSuit = trumpSuit;
  state.passedPlayers = state.passedPlayers.filter(p => p !== playerName);
  advanceBidder(state);
  checkBiddingEnd(state);
  return {};
}

function passBid(state, playerName) {
  if (state.phase !== 'bidding') return { error: 'Not bidding phase' };
  if (state.players[state.currentBidderIndex] !== playerName) return { error: 'Not your turn' };
  state.passedPlayers.push(playerName);
  advanceBidder(state);
  checkBiddingEnd(state);
  return {};
}

function advanceBidder(state) {
  let attempts = 0;
  do {
    state.currentBidderIndex = (state.currentBidderIndex + 1) % state.players.length;
    attempts++;
  } while (state.passedPlayers.includes(state.players[state.currentBidderIndex]) && attempts < state.players.length);
}

function checkBiddingEnd(state) {
  const activeBidders = state.players.filter(p => !state.passedPlayers.includes(p));
  if (activeBidders.length <= 1 && state.napoleon) {
    state.phase = 'pickAlly';
  } else if (state.passedPlayers.length === state.players.length) {
    // Everyone passed, first player is forced Napoleon with minimum bid
    state.napoleon = state.players[0];
    state.bidAmount = 1;
    state.trumpSuit = 'spades';
    state.phase = 'pickAlly';
  }
}

function pickAlly(state, playerName, { cardSuit, cardValue }) {
  if (state.phase !== 'pickAlly') return { error: 'Not pick ally phase' };
  if (playerName !== state.napoleon) return { error: 'Only Napoleon picks ally' };

  state.ally = { suit: cardSuit, value: cardValue };
  // Find who holds this card
  for (const [p, hand] of Object.entries(state.hands)) {
    if (hand.some(c => c.suit === cardSuit && c.value === cardValue)) {
      state.allyPlayer = p;
      break;
    }
  }
  state.phase = 'playing';
  state.currentPlayerIndex = state.players.indexOf(state.napoleon);
  return {};
}

function playCard(state, playerName, { cardId }) {
  if (state.phase !== 'playing') return { error: 'Not playing phase' };
  if (state.players[state.currentPlayerIndex] !== playerName) return { error: 'Not your turn' };

  const hand = state.hands[playerName];
  const cardIdx = hand.findIndex(c => c.id === cardId);
  if (cardIdx === -1) return { error: 'Card not in hand' };
  const card = hand[cardIdx];

  // Must follow lead suit if possible
  if (state.leadSuit && card.suit !== state.leadSuit) {
    if (hand.some(c => c.suit === state.leadSuit)) return { error: 'Must follow suit' };
  }

  hand.splice(cardIdx, 1);
  if (state.currentTrick.length === 0) state.leadSuit = card.suit;
  state.currentTrick.push({ player: playerName, card });

  // Check if trick is complete
  if (state.currentTrick.length === state.players.length) {
    const trickWinner = resolveTrick(state);
    state.tricks[trickWinner]++;
    state.tricksPlayed++;
    state.currentTrick = [];
    state.leadSuit = null;
    state.currentPlayerIndex = state.players.indexOf(trickWinner);

    // Check game end
    const totalTricks = Math.floor(32 / state.players.length);
    if (state.tricksPlayed >= totalTricks) {
      return endGame(state);
    }
  } else {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  }
  return {};
}

function resolveTrick(state) {
  let best = state.currentTrick[0];
  for (let i = 1; i < state.currentTrick.length; i++) {
    const entry = state.currentTrick[i];
    if (beats(entry.card, best.card, state.trumpSuit, state.leadSuit)) best = entry;
  }
  return best.player;
}

function beats(card, current, trumpSuit, leadSuit) {
  if (card.suit === trumpSuit && current.suit !== trumpSuit) return true;
  if (card.suit !== trumpSuit && current.suit === trumpSuit) return false;
  if (card.suit === current.suit) return card.rank > current.rank;
  if (card.suit === leadSuit) return current.suit !== leadSuit;
  return false;
}

function endGame(state) {
  // Napoleon's team = napoleon + ally, they need bidAmount tricks combined
  const napoleonTeamTricks = state.tricks[state.napoleon] + (state.allyPlayer && state.allyPlayer !== state.napoleon ? state.tricks[state.allyPlayer] : 0);
  if (napoleonTeamTricks >= state.bidAmount) {
    state.winner = state.napoleon;
  } else {
    state.winner = state.players.find(p => p !== state.napoleon && p !== state.allyPlayer) || state.players[0];
  }
  return { winner: state.winner, napoleonWon: napoleonTeamTricks >= state.bidAmount };
}

function getNapoleonPlayerView(state, playerName) {
  return {
    players: state.players,
    hand: state.hands[playerName],
    phase: state.phase,
    napoleon: state.napoleon,
    trumpSuit: state.trumpSuit,
    bidAmount: state.bidAmount,
    ally: playerName === state.napoleon || playerName === state.allyPlayer ? state.ally : null,
    allyRevealed: state.allyPlayer && state.currentTrick.some(t => t.card.suit === state.ally?.suit && t.card.value === state.ally?.value),
    currentPlayer: state.phase === 'bidding' ? state.players[state.currentBidderIndex] : state.players[state.currentPlayerIndex],
    currentTrick: state.currentTrick,
    tricks: state.tricks,
    tricksPlayed: state.tricksPlayed,
    passedPlayers: state.passedPlayers,
    winner: state.winner,
    leadSuit: state.leadSuit,
  };
}

module.exports = { initNapoleonGame, handleNapoleonEvent, getNapoleonPlayerView };
