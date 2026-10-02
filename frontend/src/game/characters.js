export const DETECTIVE_CHARACTERS = [
  {
    id: 'detective',
    name: 'Detective',
    codeName: 'THE SLEUTH',
    avatar: '🕵️',
    title: 'Master of Deduction',
    description: 'Expert at connecting evidence.',
    color: '#f59e0b', // Amber / Gold
    accent: '#fbbf24',
    badge: 'LEAD',
    specialty: 'Timeline Reconstruction'
  },
  {
    id: 'investigator',
    name: 'Investigator',
    codeName: 'THE FORENSIC',
    avatar: '🔍',
    title: 'Crime Scene Specialist',
    description: 'Master of physical clues.',
    color: '#3b82f6', // Sapphire Blue
    accent: '#60a5fa',
    badge: 'CSI',
    specialty: 'Physical Ballistics & Prints'
  },
  {
    id: 'hacker',
    name: 'Hacker',
    codeName: 'CYBER WATCH',
    avatar: '💻',
    title: 'Digital Cryptanalyst',
    description: 'Specialist in digital clues.',
    color: '#10b981', // Emerald Neon
    accent: '#34d399',
    badge: 'TECH',
    specialty: 'Access Logs & Security Feeds'
  },
  {
    id: 'scientist',
    name: 'Scientist',
    codeName: 'THE PATHOLOGIST',
    avatar: '🔬',
    title: 'Forensic Pathologist',
    description: 'Analyzes forensic records.',
    color: '#8b5cf6', // Violet
    accent: '#a78bfa',
    badge: 'LAB',
    specialty: 'Chemical & Material Analysis'
  },
  {
    id: 'agent',
    name: 'Agent',
    codeName: 'OPERATIVE SHADOW',
    avatar: '🕶️',
    title: 'Undercover Operative',
    description: 'Covert surveillance specialist.',
    color: '#f43f5e', // Crimson
    accent: '#fb7185',
    badge: 'INTEL',
    specialty: 'Suspect Profiling & Alibis'
  }
];

export const getDetectiveById = (id) => {
  return DETECTIVE_CHARACTERS.find((c) => c.id === id) || DETECTIVE_CHARACTERS[0];
};
