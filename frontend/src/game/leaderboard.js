const SPY_LEADERBOARD_KEY = 'SPY_HUNT_LEADERBOARD_V1';

const SEEDED_TOP_DETECTIVES = [
  { id: 'd1', name: 'Sherlock Vance', character: 'detective', points: 300, casesSolved: 3, matches: 1 },
  { id: 'd2', name: 'CipherZero', character: 'hacker', points: 280, casesSolved: 3, matches: 1 },
  { id: 'd3', name: 'Agent Cross', character: 'agent', points: 250, casesSolved: 2, matches: 1 },
  { id: 'd4', name: 'Dr. Sterling', character: 'scientist', points: 210, casesSolved: 2, matches: 1 },
  { id: 'd5', name: 'Inspector Roy', character: 'investigator', points: 190, casesSolved: 1, matches: 1 }
];

export const getSpyLeaderboard = () => {
  try {
    const raw = localStorage.getItem(SPY_LEADERBOARD_KEY);
    if (!raw) {
      localStorage.setItem(SPY_LEADERBOARD_KEY, JSON.stringify(SEEDED_TOP_DETECTIVES));
      return SEEDED_TOP_DETECTIVES;
    }
    return JSON.parse(raw);
  } catch {
    return SEEDED_TOP_DETECTIVES;
  }
};

export const recordSpyMatchResults = (playerResults = []) => {
  try {
    const list = getSpyLeaderboard();

    playerResults.forEach((res) => {
      let existing = list.find((item) => item.name.toLowerCase() === res.name.toLowerCase());
      if (existing) {
        existing.points += res.points;
        existing.casesSolved += res.casesSolved;
        existing.matches += 1;
        existing.character = res.character;
      } else {
        list.push({
          id: 'det-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: res.name,
          character: res.character,
          points: res.points,
          casesSolved: res.casesSolved,
          matches: 1
        });
      }
    });

    list.sort((a, b) => b.points - a.points || b.casesSolved - a.casesSolved);
    localStorage.setItem(SPY_LEADERBOARD_KEY, JSON.stringify(list));
    return list;
  } catch (err) {
    console.error('Error saving spy leaderboard:', err);
    return getSpyLeaderboard();
  }
};

export const resetSpyLeaderboard = () => {
  try {
    localStorage.setItem(SPY_LEADERBOARD_KEY, JSON.stringify(SEEDED_TOP_DETECTIVES));
    return SEEDED_TOP_DETECTIVES;
  } catch {
    return SEEDED_TOP_DETECTIVES;
  }
};
