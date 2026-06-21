// Napoleon Word Game - category-based name guessing
// Players submit words for a category, then guess who wrote what

const CATEGORIES = [
  'Movie star', 'Cricketer', 'City name', 'Food item', 'Animal',
  'Bollywood movie', 'Car brand', 'App name', 'Country', 'Song',
  'Color', 'Sport', 'Fruit', 'Superhero', 'TV show',
];

function initNapoleonWordGame(players) {
  return {
    players,
    scores: Object.fromEntries(players.map(p => [p, 0])),
    phase: 'submit', // submit | guess | results
    round: 1,
    totalRounds: 5,
    category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
    submissions: {}, // player -> word
    revealedWords: [], // shuffled words
    guesses: [], // { guesser, word, guessedPlayer, correct }
    currentGuesserIndex: 0,
    caught: [], // players whose words have been guessed
    winner: null,
    napoleon: players[0], // highest scorer picks next category
  };
}

function handleNapoleonWordEvent(event, state, playerName, data) {
  if (state.winner) return { error: 'Game over' };
  switch (event) {
    case 'nw_submit': return submitWord(state, playerName, data);
    case 'nw_guess': return makeGuess(state, playerName, data);
    case 'nw_set_category': return setCategory(state, playerName, data);
    default: return { error: 'Unknown event' };
  }
}

function submitWord(state, playerName, { word }) {
  if (state.phase !== 'submit') return { error: 'Not submission phase' };
  if (!word || word.trim().length === 0) return { error: 'Empty word' };
  state.submissions[playerName] = word.trim();

  // Check if all submitted
  if (Object.keys(state.submissions).length === state.players.length) {
    // Move to guess phase
    state.phase = 'guess';
    state.revealedWords = shuffleArray(
      Object.entries(state.submissions).map(([p, w]) => ({ player: p, word: w }))
    );
    state.currentGuesserIndex = 0;
    state.caught = [];
  }
  return {};
}

function makeGuess(state, playerName, { word, guessedPlayer }) {
  if (state.phase !== 'guess') return { error: 'Not guess phase' };
  const currentGuesser = state.players[state.currentGuesserIndex];
  if (playerName !== currentGuesser) return { error: 'Not your turn to guess' };

  // Can't guess your own
  const entry = state.revealedWords.find(e => e.word === word && !state.caught.includes(e.player));
  if (!entry) return { error: 'Invalid word' };
  if (guessedPlayer === playerName) return { error: "Can't guess yourself" };

  const correct = entry.player === guessedPlayer;
  state.guesses.push({ guesser: playerName, word, guessedPlayer, correct });

  if (correct) {
    state.scores[playerName] = (state.scores[playerName] || 0) + 1;
    state.caught.push(entry.player);

    // Check if all caught
    if (state.caught.length >= state.players.length - 1) {
      return endRound(state);
    }
    // Correct guesser goes again (stay on same index)
    return {};
  } else {
    // Wrong: next guesser
    advanceGuesser(state);
    // If looped back to caught players or all had a turn
    if (allGuessersExhausted(state)) {
      return endRound(state);
    }
    return {};
  }
}

function setCategory(state, playerName, { category }) {
  if (playerName !== state.napoleon) return { error: 'Only Napoleon can set category' };
  if (state.phase !== 'submit') return { error: 'Can only set before submissions' };
  state.category = category;
  return {};
}

function advanceGuesser(state) {
  let attempts = 0;
  do {
    state.currentGuesserIndex = (state.currentGuesserIndex + 1) % state.players.length;
    attempts++;
  } while (state.caught.includes(state.players[state.currentGuesserIndex]) && attempts < state.players.length);
}

function allGuessersExhausted(state) {
  const uncaught = state.players.filter(p => !state.caught.includes(p));
  return uncaught.length <= 1;
}

function endRound(state) {
  if (state.round >= state.totalRounds) {
    // Game over
    const maxScore = Math.max(...Object.values(state.scores));
    state.winner = Object.entries(state.scores).find(([_, s]) => s === maxScore)?.[0] || state.players[0];
    state.phase = 'results';
    return { winner: state.winner };
  }

  // Next round
  state.round++;
  state.phase = 'submit';
  state.submissions = {};
  state.revealedWords = [];
  state.guesses = [];
  state.caught = [];
  state.currentGuesserIndex = 0;
  state.category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  // Napoleon = highest scorer
  const maxScore = Math.max(...Object.values(state.scores));
  state.napoleon = Object.entries(state.scores).find(([_, s]) => s === maxScore)?.[0] || state.players[0];

  return {};
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getNapoleonWordPlayerView(state, playerName) {
  return {
    players: state.players,
    scores: state.scores,
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,
    category: state.category,
    submitted: !!state.submissions[playerName],
    submissionCount: Object.keys(state.submissions).length,
    revealedWords: state.phase === 'guess' || state.phase === 'results' ? state.revealedWords.map(e => ({ word: e.word, caught: state.caught.includes(e.player), player: state.caught.includes(e.player) ? e.player : null })) : [],
    guesses: state.guesses,
    currentGuesser: state.players[state.currentGuesserIndex],
    caught: state.caught,
    napoleon: state.napoleon,
    winner: state.winner,
  };
}

module.exports = { initNapoleonWordGame, handleNapoleonWordEvent, getNapoleonWordPlayerView };
