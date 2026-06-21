// Teen Patti - Indian Poker (3-6 players)
// 3 cards each, betting rounds, blind/seen status

const { shuffle } = require('../utils/deck');

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function createTeenPattiDeck() {
  let id = 0;
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ id: id++, suit, value, rank: VALUES.indexOf(value) });
    }
  }
  return deck;
}

function initTeenPattiGame(players, existingChips) {
  const deck = shuffle(createTeenPattiDeck());
  const hands = {};
  const status = {};
  for (const p of players) {
    hands[p] = deck.splice(0, 3);
    status[p] = 'blind';
  }

  const bootAmount = 10;
  const pot = bootAmount * players.length;
  const chips = existingChips
    ? Object.fromEntries(players.map(p => [p, (existingChips[p] || 1000) - bootAmount]))
    : Object.fromEntries(players.map(p => [p, 1000 - bootAmount]));

  return {
    players,
    hands,
    status,
    chips,
    pot,
    currentBet: bootAmount,
    currentPlayerIndex: 0,
    activePlayers: [...players],
    winner: null,
    round: 1,
  };
}

function handleTeenPattiEvent(event, state, playerName, data) {
  if (state.winner) return { error: 'Game over' };
  if (!state.activePlayers.includes(playerName)) return { error: 'You folded' };

  switch (event) {
    case 'tp_see': return seeCards(state, playerName);
    case 'tp_bet': return placeBet(state, playerName, data);
    case 'tp_fold': return fold(state, playerName);
    case 'tp_show': return showdown(state, playerName, data);
    default: return { error: 'Unknown event' };
  }
}

function seeCards(state, playerName) {
  if (state.status[playerName] !== 'blind') return { error: 'Already seen' };
  state.status[playerName] = 'seen';
  return {};
}

function placeBet(state, playerName, { amount }) {
  if (state.activePlayers[state.currentPlayerIndex % state.activePlayers.length] !== playerName) return { error: 'Not your turn' };

  const isSeen = state.status[playerName] === 'seen';
  const minBet = isSeen ? state.currentBet * 2 : state.currentBet;
  const maxBet = minBet * 2;

  if (amount < minBet || amount > maxBet) return { error: `Bet must be ${minBet}-${maxBet}` };
  if (state.chips[playerName] < amount) return { error: 'Not enough chips' };

  state.chips[playerName] -= amount;
  state.pot += amount;
  state.currentBet = isSeen ? Math.floor(amount / 2) : amount;
  state.round++;
  advanceTeenPattiTurn(state);
  return {};
}

function fold(state, playerName) {
  state.status[playerName] = 'folded';
  state.activePlayers = state.activePlayers.filter(p => p !== playerName);

  if (state.activePlayers.length === 1) {
    state.winner = state.activePlayers[0];
    state.chips[state.winner] += state.pot;
    return { winner: state.winner };
  }
  // Fix index if needed
  if (state.currentPlayerIndex >= state.activePlayers.length) state.currentPlayerIndex = 0;
  return {};
}

function showdown(state, playerName, { targetPlayer }) {
  if (state.activePlayers[state.currentPlayerIndex % state.activePlayers.length] !== playerName) return { error: 'Not your turn' };
  if (state.status[playerName] !== 'seen') return { error: 'Must see cards first' };
  if (!state.activePlayers.includes(targetPlayer)) return { error: 'Invalid target' };
  if (targetPlayer === playerName) return { error: 'Cannot show against yourself' };

  // Pay show cost
  const cost = state.currentBet * 2;
  if (state.chips[playerName] < cost) return { error: 'Not enough chips' };
  state.chips[playerName] -= cost;
  state.pot += cost;

  const hand1 = state.hands[playerName];
  const hand2 = state.hands[targetPlayer];
  const rank1 = getHandRank(hand1);
  const rank2 = getHandRank(hand2);

  const loser = rank1 >= rank2 ? targetPlayer : playerName;
  state.status[loser] = 'folded';
  state.activePlayers = state.activePlayers.filter(p => p !== loser);

  if (state.activePlayers.length === 1) {
    state.winner = state.activePlayers[0];
    state.chips[state.winner] += state.pot;
    return { winner: state.winner, showdown: { [playerName]: hand1, [targetPlayer]: hand2 }, loser };
  }
  if (state.currentPlayerIndex >= state.activePlayers.length) state.currentPlayerIndex = 0;
  return { showdown: { [playerName]: hand1, [targetPlayer]: hand2 }, loser };
}

function advanceTeenPattiTurn(state) {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.activePlayers.length;
}

// Hand ranking: Trail > Pure Sequence > Sequence > Color > Pair > High Card
function getHandRank(hand) {
  const sorted = [...hand].sort((a, b) => a.rank - b.rank);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const isSeq = (ranks[2] - ranks[1] === 1 && ranks[1] - ranks[0] === 1) || (ranks[0] === 0 && ranks[1] === 11 && ranks[2] === 12); // A-2-3 or Q-K-A

  if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) return 5000 + ranks[0]; // Trail
  if (isFlush && isSeq) return 4000 + ranks[2]; // Pure sequence
  if (isSeq) return 3000 + ranks[2]; // Sequence
  if (isFlush) return 2000 + ranks[2]; // Color
  if (ranks[0] === ranks[1]) return 1000 + ranks[0] * 13 + ranks[2]; // Pair
  if (ranks[1] === ranks[2]) return 1000 + ranks[1] * 13 + ranks[0]; // Pair
  return ranks[2] * 100 + ranks[1] * 10 + ranks[0]; // High card
}

function getTeenPattiPlayerView(state, playerName) {
  return {
    players: state.players,
    hand: state.status[playerName] === 'seen' ? state.hands[playerName] : null,
    status: state.status,
    chips: state.chips,
    pot: state.pot,
    currentBet: state.currentBet,
    currentPlayer: state.activePlayers.length > 0 ? state.activePlayers[state.currentPlayerIndex % state.activePlayers.length] : null,
    activePlayers: state.activePlayers,
    winner: state.winner,
    round: state.round,
    isSeen: state.status[playerName] === 'seen',
  };
}

module.exports = { initTeenPattiGame, handleTeenPattiEvent, getTeenPattiPlayerView };
