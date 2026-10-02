export const LOCATIONS = [
  { id: 'MUSEUM', name: 'MUSEUM', icon: '🏛', subtitle: 'Exhibition & Historical Archives', x: 50, y: 15 },
  { id: 'BANK', name: 'BANK', icon: '🏦', subtitle: 'Vault & Financial Terminal', x: 15, y: 50 },
  { id: 'HOTEL', name: 'HOTEL', icon: '🏨', subtitle: 'Grand Central Suites & Lobbies', x: 50, y: 50 },
  { id: 'STATION', name: 'STATION', icon: '🚉', subtitle: 'Metro Junction & Cargo Platforms', x: 85, y: 50 },
  { id: 'CAFE', name: 'CAFE', icon: '☕', subtitle: 'Roastery & Public Lounge', x: 50, y: 85 }
];

export const MAP_CONNECTIONS = [
  { from: 'MUSEUM', to: 'HOTEL' },
  { from: 'BANK', to: 'HOTEL' },
  { from: 'HOTEL', to: 'STATION' },
  { from: 'HOTEL', to: 'CAFE' }
];

export const CASES = [
  {
    id: 'missing_diamond',
    round: 1,
    title: 'THE MISSING DIAMOND',
    location: 'MUSEUM',
    locationIcon: '🏛',
    story: 'A priceless diamond disappeared during a private museum gala. Three people were near the exhibition hall.',
    suspects: [
      {
        id: 'alex',
        name: 'Alex Morgan',
        avatar: '👔',
        role: 'Museum Curator',
        description: 'Oversees VIP exhibits. Claims he was inspecting camera cables in the east wing.'
      },
      {
        id: 'riya',
        name: 'Riya Sharma',
        avatar: '💎',
        role: 'Antique Collector',
        description: 'Observed near the main gallery. Insists she was enjoying espresso during the event.'
      },
      {
        id: 'marcus',
        name: 'Marcus Lee',
        avatar: '🛡️',
        role: 'Chief Security Guard',
        description: 'Possesses master access keys to high-security vaults. Left the museum right after.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Security Log',
        location: 'MUSEUM',
        icon: '📋',
        text: 'The museum security log shows that the exhibition room was opened at 9:42 PM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'CCTV Surveillance',
        location: 'STATION',
        icon: '📹',
        text: 'CCTV shows one suspect leaving the museum through the east entrance shortly afterward.'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Cafe Timestamp',
        location: 'CAFE',
        icon: '☕',
        text: 'A cafe receipt places another suspect at the cafe during the critical time.'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Access Badge Verification',
        location: 'BANK',
        icon: '🔑',
        text: 'The security badge used to open the exhibition room belongs to the remaining suspect.'
      }
    ],
    culprit: 'Marcus Lee',
    deductionNote: 'The cafe receipt corroborates Riya Sharma’s alibi. CCTV tracks Alex Morgan exiting, while the digital badge used to enter the exhibition room at 9:42 PM belongs to Marcus Lee.'
  },
  {
    id: 'hotel_blackout',
    round: 2,
    title: 'THE HOTEL BLACKOUT',
    location: 'HOTEL',
    locationIcon: '🏨',
    story: 'During a five-minute blackout, an important confidential file disappeared from Room 407.',
    suspects: [
      {
        id: 'emma',
        name: 'Emma Stone',
        avatar: '📸',
        role: 'Investigative Journalist',
        description: 'Resident in suite 302. Inquiring about confidential corporate mergers.'
      },
      {
        id: 'daniel',
        name: 'Daniel Roy',
        avatar: '💼',
        role: 'Systems Consultant',
        description: 'Contracted for network maintenance. Spotted near service elevators before power loss.'
      },
      {
        id: 'leo',
        name: 'Leo Khan',
        avatar: '🗝️',
        role: 'Hotel Concierge',
        description: 'Master key administrator on duty. Accountable for 4th-floor floor access.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Power Grid Telemetry',
        location: 'HOTEL',
        icon: '⚡',
        text: 'The blackout began at 10:15 PM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Elevator Shaft Log',
        location: 'BANK',
        icon: '🛗',
        text: 'The elevator log shows one suspect reached the fourth floor at 10:16 PM.'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Lounge Registry',
        location: 'CAFE',
        icon: '☕',
        text: 'Another suspect was recorded at the hotel cafe during the blackout.'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Electronic Keycard Audit',
        location: 'MUSEUM',
        icon: '💳',
        text: 'A keycard log shows the remaining suspect opened Room 407.'
      }
    ],
    culprit: 'Daniel Roy',
    deductionNote: 'Emma was verified at the ground cafe, and Leo was registered entering the elevator at 10:16 PM. The electronic door cylinder audit reveals Daniel Roy swiped into Room 407.'
  },
  {
    id: 'stolen_painting',
    round: 3,
    title: 'THE STOLEN PAINTING',
    location: 'BANK',
    locationIcon: '🏦',
    story: 'A rare painting being transported for an auction disappeared before the security transfer.',
    suspects: [
      {
        id: 'nora',
        name: 'Nora',
        avatar: '🎨',
        role: 'Fine Art Appraiser',
        description: 'Certified the authenticity of the painting inside the bank private vault.'
      },
      {
        id: 'victor',
        name: 'Victor',
        avatar: '📦',
        role: 'Armored Courier Driver',
        description: 'Designated to load cargo containers into armored transit vehicle.'
      },
      {
        id: 'sam',
        name: 'Sam',
        avatar: '🚆',
        role: 'Railway Station Dispatcher',
        description: 'Coordinated express freight wagons at the adjoining station terminal.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Vault Manifest',
        location: 'BANK',
        icon: '🕒',
        text: 'The painting was last recorded at 8:20 PM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Station Arrival Gate',
        location: 'STATION',
        icon: '🚉',
        text: 'Station CCTV shows one suspect arriving on a train at 8:10 PM.'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Vault Access System',
        location: 'MUSEUM',
        icon: '🔐',
        text: 'The bank access system recorded another suspect entering the storage room at 8:21 PM.'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Eyewitness Statement',
        location: 'HOTEL',
        icon: '👁️',
        text: 'A witness saw the remaining suspect leaving the building carrying a large case.'
      }
    ],
    culprit: 'Victor',
    deductionNote: 'Sam arrived on the train at 8:10 PM, and Nora was recorded entering the storage room at 8:21 PM. The eyewitness testimony identifies Victor carrying the painting case away.'
  },
  {
    id: 'poisoned_coffee',
    round: 4,
    title: 'THE POISONED COFFEE',
    location: 'CAFE',
    locationIcon: '☕',
    story: 'A famous food critic collapsed after sipping an exclusive pour-over at the midnight cafe tasting.',
    suspects: [
      {
        id: 'marco',
        name: 'Marco',
        avatar: '👨‍🍳',
        role: 'Master Barista',
        description: 'Personally brewed the roast blend. Claims he was strictly calibrated by the steam wand.'
      },
      {
        id: 'elena',
        name: 'Elena Rostova',
        avatar: '🕶️',
        role: 'Rival Cafe Owner',
        description: 'Entered unannounced right before the tasting. Hovered suspiciously around the sugar bar.'
      },
      {
        id: 'julian',
        name: 'Julian Vance',
        avatar: '📱',
        role: 'Venture Investor',
        description: 'Financed the bistro chain. Seen outside having a furious argument on his cellphone.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Barista Service Chit',
        location: 'CAFE',
        icon: '☕',
        text: 'The espresso machine log confirms the order was prepared cleanly at 11:14 PM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Forensic Toxin Report',
        location: 'HOTEL',
        icon: '🧪',
        text: 'Forensic toxicology detected traces of almond poison introduced directly into the serving cup.'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Courtyard Surveillance',
        location: 'BANK',
        icon: '📹',
        text: 'CCTV footage confirms Julian Vance remained outdoors on his phone from 11:10 PM to 11:22 PM.'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Condiment Stand Search',
        location: 'MUSEUM',
        icon: '🧴',
        text: 'A small dropper vial of almond extract with wiped fingerprints was found in Elena Rostova’s coat.'
      }
    ],
    culprit: 'Elena Rostova',
    deductionNote: 'Julian Vance was verified on the phone outdoors, and Barista Marco stayed at the espresso machine. Forensic recovery places the poison vial directly inside Elena Rostova’s coat.'
  },
  {
    id: 'midnight_express',
    round: 5,
    title: 'THE MIDNIGHT EXPRESS HEIST',
    location: 'STATION',
    locationIcon: '🚉',
    story: 'A diplomatic briefcase was swapped with counterfeit papers aboard the midnight express train.',
    suspects: [
      {
        id: 'arthur',
        name: 'Arthur Pendelton',
        avatar: '💼',
        role: 'Diplomatic Courier',
        description: 'Designated carrier for state secrets. Claims someone tampered with the cabin latch.'
      },
      {
        id: 'nadia',
        name: 'Nadia Petrova',
        avatar: '📸',
        role: 'Foreign Reporter',
        description: 'Boarded without heavy luggage. Kept taking flash photographs near the sleeper cars.'
      },
      {
        id: 'kyle',
        name: 'Officer Kyle',
        avatar: '👮',
        role: 'Transit Police Officer',
        description: 'On night patrol duty. Holds electronic bypass clearance for private passenger cabins.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Platform Arrival Clock',
        location: 'STATION',
        icon: '🕒',
        text: 'The midnight express pulled onto Platform 4 at exactly 12:05 AM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Exit Turnstile Scanner',
        location: 'CAFE',
        icon: '🎫',
        text: 'Station exit turnstiles recorded Nadia Petrova passing through to the outside square at 12:15 AM.'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Deadbolt Electronic Log',
        location: 'HOTEL',
        icon: '🔑',
        text: 'The diplomatic cabin deadbolt was overridden with a transit security master card at 12:08 AM.'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Courier Luggage Scan',
        location: 'BANK',
        icon: '📦',
        text: 'Baggage X-ray scans verify Arthur entered the train with the authentic sealed documents intact.'
      }
    ],
    culprit: 'Officer Kyle',
    deductionNote: 'Arthur possessed the real documents upon boarding, and Nadia had already exited the station turnstiles. The master electronic override at 12:08 AM belongs exclusively to Officer Kyle.'
  },
  {
    id: 'cyber_vault_breach',
    round: 6,
    title: 'THE CYBER VAULT BREACH',
    location: 'BANK',
    locationIcon: '🏦',
    story: 'An encrypted quantum storage drive was extracted from the subterranean vault during routine maintenance.',
    suspects: [
      {
        id: 'aris',
        name: 'Dr. Aris Thorne',
        avatar: '🔬',
        role: 'Quantum Physicist',
        description: 'Created the drive hardware. Claims she was locked inside the cleanroom facility.'
      },
      {
        id: 'maya',
        name: 'Maya Lin',
        avatar: '💻',
        role: 'Cybersecurity Auditor',
        description: 'Conducted network penetration tests. Flagged repeated brute-force server attempts.'
      },
      {
        id: 'vincent',
        name: 'Vincent Cross',
        avatar: '🕶️',
        role: 'Facility Operations Lead',
        description: 'Maintains vault mechanical vents. Known to carry heavy hydraulic duct tools.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Vault Cabinet Sensor',
        location: 'BANK',
        icon: '🗄️',
        text: 'The quantum vault chassis was mechanically forced open from behind at 2:40 AM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Cleanroom Airlock Record',
        location: 'MUSEUM',
        icon: '🧬',
        text: 'Airlock biometric sensors verify Dr. Aris Thorne remained sealed in the laboratory until 3:00 AM.'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Terminal Keystroke Audit',
        location: 'HOTEL',
        icon: '⌨️',
        text: 'Maya Lin was confirmed continuously typing audit scripts on the Floor 2 terminal from 2:35 AM to 2:45 AM.'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Ventilation Hatch Inspection',
        location: 'STATION',
        icon: '🔧',
        text: 'The air intake duct directly behind the vault was unbolted with Vincent Cross’s custom wrench.'
      }
    ],
    culprit: 'Vincent Cross',
    deductionNote: 'Dr. Thorne was sealed in the cleanroom, and Maya Lin was logged active on the 2nd floor terminal. The mechanical duct breach behind the vault was executed with Vincent Cross’s wrench.'
  }
];

export const getCaseById = (caseId) => {
  return CASES.find((c) => c.id === caseId) || CASES[0];
};

export const getCaseByRound = (roundNumber, activeCaseId = null) => {
  if (activeCaseId) {
    const found = CASES.find((c) => c.id === activeCaseId);
    if (found) return found;
  }
  return CASES.find((c) => c.round === roundNumber) || CASES[(roundNumber - 1) % CASES.length] || CASES[0];
};

// Generates 3 distinct randomized case IDs for each match so every match is unique
export const generateMatchCasePlan = () => {
  const shuffled = [...CASES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3).map((c) => c.id);
};
