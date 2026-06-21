const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];

function createUnoDeck() {
  const deck = [];
  let id = 0;
  // One 0 per color, two of each other value
  for (const color of COLORS) {
    deck.push({ id: id++, color, value: '0' });
    for (const value of VALUES.slice(1)) {
      deck.push({ id: id++, color, value });
      deck.push({ id: id++, color, value });
    }
  }
  // 4 Wilds and 4 Wild Draw Fours
  for (let i = 0; i < 4; i++) {
    deck.push({ id: id++, color: 'wild', value: 'wild' });
    deck.push({ id: id++, color: 'wild', value: 'wild_draw4' });
  }
  return deck;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = { createUnoDeck, shuffle, COLORS };
