export const MAP_CONFIG = {
  width: 800,
  height: 500,
  roundDuration: 30, // 30 seconds per round
  totalRounds: 3,
  obstacles: [
    // Center divider pillars
    { x: 380, y: 120, width: 40, height: 100, label: 'Core Alpha' },
    { x: 380, y: 280, width: 40, height: 100, label: 'Core Beta' },
    // Flanking barricades
    { x: 180, y: 200, width: 40, height: 100, label: 'West Gate' },
    { x: 580, y: 200, width: 40, height: 100, label: 'East Gate' },
    // Corner tacticals
    { x: 260, y: 70, width: 90, height: 26, label: 'North Barrier' },
    { x: 450, y: 404, width: 90, height: 26, label: 'South Barrier' }
  ],
  spawns: {
    p1: { x: 90, y: 90 },
    p2: { x: 710, y: 410 }
  }
};

/**
 * Generate standard orbs for a given round based on seed or list
 */
export const generateOrbs = (count = 14, seed = Date.now()) => {
  const orbs = [];
  // Deterministic pseudo-random based on round seed
  let s = seed;
  const pseudoRandom = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const isInsideObstacle = (x, y, radius = 18) => {
    for (const obs of MAP_CONFIG.obstacles) {
      if (
        x + radius > obs.x &&
        x - radius < obs.x + obs.width &&
        y + radius > obs.y &&
        y - radius < obs.y + obs.height
      ) {
        return true;
      }
    }
    return false;
  };

  let attempts = 0;
  while (orbs.length < count && attempts < 200) {
    attempts++;
    const x = Math.floor(50 + pseudoRandom() * (MAP_CONFIG.width - 100));
    const y = Math.floor(50 + pseudoRandom() * (MAP_CONFIG.height - 100));
    
    // Don't spawn on top of obstacles
    if (isInsideObstacle(x, y, 22)) continue;
    
    // Don't spawn too close to player initial spawns
    const dP1 = Math.hypot(x - MAP_CONFIG.spawns.p1.x, y - MAP_CONFIG.spawns.p1.y);
    const dP2 = Math.hypot(x - MAP_CONFIG.spawns.p2.x, y - MAP_CONFIG.spawns.p2.y);
    if (dP1 < 80 || dP2 < 80) continue;

    const isGolden = orbs.length % 4 === 0; // 25% golden bonus orbs (+25 pts)
    orbs.push({
      id: `orb-${seed}-${orbs.length}`,
      x,
      y,
      type: isGolden ? 'golden' : 'standard',
      points: isGolden ? 25 : 10,
      radius: isGolden ? 11 : 8,
      color: isGolden ? '#fbbf24' : '#38bdf8',
      pulseSpeed: isGolden ? 0.08 : 0.05
    });
  }

  return orbs;
};

/**
 * Handle circle vs rectangle obstacles collision
 */
export const resolveObstacleCollisions = (x, y, radius) => {
  let nx = x;
  let ny = y;

  // Boundary checks
  nx = Math.max(radius + 6, Math.min(MAP_CONFIG.width - radius - 6, nx));
  ny = Math.max(radius + 6, Math.min(MAP_CONFIG.height - radius - 6, ny));

  // Obstacle collision resolution
  for (const obs of MAP_CONFIG.obstacles) {
    // Find closest point on obstacle rectangle
    const closestX = Math.max(obs.x, Math.min(nx, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(ny, obs.y + obs.height));

    const distX = nx - closestX;
    const distY = ny - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < radius * radius && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;
      nx += (distX / dist) * overlap;
      ny += (distY / dist) * overlap;
    }
  }

  return { x: nx, y: ny };
};
