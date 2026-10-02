const LEADERBOARD_KEY = 'CYBER_ARENA_LEADERBOARD_V1';

const DEFAULT_SEEDED_CHAMPIONS = [
  { id: 'c1', name: 'NexusPrime', character: 'volt', wins: 28, matches: 32, highScore: 185, winRate: '87.5%' },
  { id: 'c2', name: 'AegisShield', character: 'aegis', wins: 24, matches: 30, highScore: 160, winRate: '80.0%' },
  { id: 'c3', name: 'Valkyrie9', character: 'pyro', wins: 21, matches: 27, highScore: 195, winRate: '77.7%' },
  { id: 'c4', name: 'ShadowDrifter', character: 'void', wins: 19, matches: 25, highScore: 150, winRate: '76.0%' },
  { id: 'c5', name: 'CircuitBreaker', character: 'volt', wins: 15, matches: 22, highScore: 140, winRate: '68.1%' }
];

export const getLeaderboard = () => {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(DEFAULT_SEEDED_CHAMPIONS));
      return DEFAULT_SEEDED_CHAMPIONS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SEEDED_CHAMPIONS;
  }
};

export const recordMatchResult = ({ winner, p1, p2, roundsData }) => {
  try {
    const list = getLeaderboard();

    const updatePlayer = (player, didWin, finalScore) => {
      let existing = list.find((item) => item.name.toLowerCase() === player.name.toLowerCase());
      if (existing) {
        existing.matches += 1;
        if (didWin) existing.wins += 1;
        existing.highScore = Math.max(existing.highScore, finalScore);
        existing.character = player.character;
        existing.winRate = ((existing.wins / existing.matches) * 100).toFixed(1) + '%';
      } else {
        list.push({
          id: 'player-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: player.name,
          character: player.character,
          wins: didWin ? 1 : 0,
          matches: 1,
          highScore: finalScore,
          winRate: didWin ? '100%' : '0%'
        });
      }
    };

    const p1Won = winner === 'p1';
    const p2Won = winner === 'p2';

    updatePlayer(p1, p1Won, p1.totalScore || 0);
    updatePlayer(p2, p2Won, p2.totalScore || 0);

    // Sort by wins then highScore
    list.sort((a, b) => b.wins - a.wins || b.highScore - a.highScore);

    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list));
    return list;
  } catch (err) {
    console.error('Error saving leaderboard:', err);
    return getLeaderboard();
  }
};

export const resetLeaderboard = () => {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(DEFAULT_SEEDED_CHAMPIONS));
    return DEFAULT_SEEDED_CHAMPIONS;
  } catch {
    return DEFAULT_SEEDED_CHAMPIONS;
  }
};
