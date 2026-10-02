export const CHARACTERS = [
  {
    id: 'volt',
    name: 'VOLT',
    title: 'Cyber Speedster',
    icon: '⚡',
    color: '#06b6d4',
    secondaryColor: '#38bdf8',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    speed: 6.0,
    radius: 18,
    magnetRadius: 28,
    trait: 'Hyper Agility (+20% Base Speed)',
    stats: { speed: 95, magnet: 60, handling: 90 },
    bio: 'Engineered for pure kinetic velocity. Outpaces rivals on open straights.'
  },
  {
    id: 'aegis',
    name: 'AEGIS',
    title: 'Titan Guardian',
    icon: '🛡️',
    color: '#8b5cf6',
    secondaryColor: '#c084fc',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    speed: 4.6,
    radius: 22,
    magnetRadius: 52,
    trait: 'Graviton Aura (2x Orb Attraction)',
    stats: { speed: 65, magnet: 100, handling: 70 },
    bio: 'Deploys a localized graviton field that pulls nearby energy crystals directly into grasp.'
  },
  {
    id: 'pyro',
    name: 'PYRO',
    title: 'Solar Striker',
    icon: '🔥',
    color: '#f43f5e',
    secondaryColor: '#fb7185',
    glowColor: 'rgba(244, 63, 94, 0.6)',
    speed: 5.2,
    radius: 20,
    magnetRadius: 32,
    dashBoost: 1.7,
    trait: 'Nitro Surge (Hold Space / Dash Button)',
    stats: { speed: 80, magnet: 65, handling: 85 },
    bio: 'Channel core energy into instant sprint bursts to snatch high-value golden stars.'
  },
  {
    id: 'void',
    name: 'PHANTOM',
    title: 'Void Weaver',
    icon: '👻',
    color: '#10b981',
    secondaryColor: '#34d399',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    speed: 5.4,
    radius: 19,
    magnetRadius: 34,
    trait: 'Phase Glide (Frictionless Turning)',
    stats: { speed: 82, magnet: 75, handling: 98 },
    bio: 'Glides across the cyber grid with zero inertia, cutting tight turns around arena obstacles.'
  }
];

export const getCharacterById = (id) => {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
};
