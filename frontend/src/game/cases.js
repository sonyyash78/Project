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
    question: 'Who used their security badge to unlock the exhibition room and steal the diamond at 9:42 PM?',
    howToSolve: 'Alex Morgan was at the train station. Riya Sharma was at the cafe. Marcus Lee\'s badge opened the vault!',
    suspects: [
      {
        id: 'alex',
        name: 'Alex Morgan',
        avatar: '👔',
        role: 'Museum Curator',
        description: 'Oversees VIP exhibits. Left early through the east exit.'
      },
      {
        id: 'riya',
        name: 'Riya Sharma',
        avatar: '💎',
        role: 'Antique Collector',
        description: 'Attended the gala. Seen sitting in the museum cafe.'
      },
      {
        id: 'marcus',
        name: 'Marcus Lee',
        avatar: '🛡️',
        role: 'Chief Security Guard',
        description: 'In charge of security keys and access badges for the vault.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Vault Security Log',
        location: 'MUSEUM',
        icon: '📋',
        text: 'The museum security log confirms the diamond exhibition vault was unlocked at 9:42 PM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Station CCTV Camera',
        location: 'STATION',
        icon: '📹',
        text: 'Station CCTV clearly recorded Alex Morgan boarding an express train at 9:35 PM (Alibi verified).'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Cafe Receipt Log',
        location: 'CAFE',
        icon: '☕',
        text: 'A cafe timestamped receipt proves Riya Sharma was sitting drinking espresso at 9:42 PM (Alibi verified).'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Badge Audit Record',
        location: 'BANK',
        icon: '🔑',
        text: 'Digital security scanner logs prove the badge used to unlock the vault at 9:42 PM belongs to Marcus Lee!'
      }
    ],
    culprit: 'Marcus Lee',
    deductionNote: 'Alex Morgan was at the train station at 9:35 PM, and Riya Sharma was drinking espresso at the cafe at 9:42 PM. The security badge used to breach the vault belongs directly to Marcus Lee!'
  },
  {
    id: 'hotel_blackout',
    round: 2,
    title: 'THE HOTEL BLACKOUT',
    location: 'HOTEL',
    locationIcon: '🏨',
    story: 'During a five-minute blackout, an important confidential file disappeared from Room 407.',
    question: 'Who entered Room 407 during the 10:15 PM blackout and stole the confidential file?',
    howToSolve: 'Leo Khan was trapped in the elevator. Emma Stone was at the cafe. Daniel Roy\'s keycard swiped Room 407!',
    suspects: [
      {
        id: 'emma',
        name: 'Emma Stone',
        avatar: '📸',
        role: 'Investigative Journalist',
        description: 'Resident in suite 302. Claims she was having tea downstairs.'
      },
      {
        id: 'daniel',
        name: 'Daniel Roy',
        avatar: '💼',
        role: 'Systems Consultant',
        description: 'Contracted for network maintenance. Holds duplicate keycards.'
      },
      {
        id: 'leo',
        name: 'Leo Khan',
        avatar: '🗝️',
        role: 'Hotel Concierge',
        description: 'Master key administrator on duty during the night shift.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Power Grid Telemetry',
        location: 'HOTEL',
        icon: '⚡',
        text: 'The blackout began at 10:15 PM and ended at 10:20 PM (a 5-minute window).'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Elevator Shaft Sensor',
        location: 'BANK',
        icon: '🛗',
        text: 'The elevator emergency log proves Leo Khan was trapped inside the lift from 10:15 to 10:19 PM (Alibi verified).'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Cafe Video Surveillance',
        location: 'CAFE',
        icon: '☕',
        text: 'Hotel cafe cameras recorded Emma Stone sitting and drinking tea continuously from 10:10 to 10:25 PM (Alibi verified).'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Room 407 Door Lock Log',
        location: 'MUSEUM',
        icon: '💳',
        text: 'The electronic lock audit on Room 407 recorded Daniel Roy\'s personal keycard opening the door at 10:17 PM!'
      }
    ],
    culprit: 'Daniel Roy',
    deductionNote: 'Leo Khan was trapped in the elevator, and Emma Stone was verified on cafe video. The electronic keycard used to open Room 407 at 10:17 PM belongs to Daniel Roy!'
  },
  {
    id: 'stolen_painting',
    round: 3,
    title: 'THE STOLEN PAINTING',
    location: 'BANK',
    locationIcon: '🏦',
    story: 'A rare painting being transported for an auction disappeared before the security transfer.',
    question: 'Who entered the storage area at 8:21 PM and carried the stolen painting away?',
    howToSolve: 'Sam was on Platform 2. Nora was in the appraisal hall. Victor was caught loading the painting crate!',
    suspects: [
      {
        id: 'nora',
        name: 'Nora',
        avatar: '🎨',
        role: 'Fine Art Appraiser',
        description: 'Certified the authenticity of the painting inside the bank vault.'
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
        title: 'Vault Manifest Log',
        location: 'BANK',
        icon: '🕒',
        text: 'The masterpiece painting was verified safely inside the storage room at 8:20 PM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Railway Platform Camera',
        location: 'STATION',
        icon: '🚉',
        text: 'Station CCTV shows Sam actively dispatching express freight on Platform 2 from 8:15 to 8:30 PM (Alibi verified).'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Appraisal Hall Scanner',
        location: 'MUSEUM',
        icon: '🔐',
        text: 'Biometric scanners confirm Nora was inside the appraisal gallery speaking with clients at 8:21 PM (Alibi verified).'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Loading Bay Eyewitness',
        location: 'HOTEL',
        icon: '👁️',
        text: 'A security guard witnessed Victor carrying the sealed painting case into an unmarked vehicle at 8:23 PM!'
      }
    ],
    culprit: 'Victor',
    deductionNote: 'Sam was verified on Platform 2, and Nora was in the appraisal gallery. Security eyewitness testimony identifies Victor carrying the painting case away!'
  },
  {
    id: 'poisoned_coffee',
    round: 4,
    title: 'THE POISONED COFFEE',
    location: 'CAFE',
    locationIcon: '☕',
    story: 'A famous food critic collapsed after sipping an exclusive pour-over at the midnight cafe tasting.',
    question: 'Who contaminated the food critic\'s coffee mug with toxic almond extract?',
    howToSolve: 'Marco stayed at the coffee machine. Julian was on the phone outside. Elena\'s prints were on the poison bottle!',
    suspects: [
      {
        id: 'marco',
        name: 'Marco',
        avatar: '👨‍🍳',
        role: 'Master Barista',
        description: 'Personally brewed the roast blend at the espresso station.'
      },
      {
        id: 'elena',
        name: 'Elena Rostova',
        avatar: '🕶️',
        role: 'Rival Cafe Owner',
        description: 'Entered unannounced. Seen hovering around the sugar & condiment bar.'
      },
      {
        id: 'julian',
        name: 'Julian Vance',
        avatar: '📱',
        role: 'Venture Investor',
        description: 'Financed the bistro chain. Seen outside pacing on the terrace.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Barista Service Chit',
        location: 'CAFE',
        icon: '☕',
        text: 'The espresso machine log confirms the pour-over was brewed at 11:14 PM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Espresso Counter Camera',
        location: 'HOTEL',
        icon: '🧪',
        text: 'Counter video confirms Marco never left the grinder and steam wand between 11:10 and 11:20 PM (Alibi verified).'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Courtyard Phone Records',
        location: 'BANK',
        icon: '📹',
        text: 'CCTV and phone logs prove Julian Vance was speaking outdoors on a business call from 11:10 to 11:22 PM (Alibi verified).'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Forensic Toxin Bottle',
        location: 'MUSEUM',
        icon: '🧴',
        text: 'Forensics found the almond poison dropper bottle beside the sugar bar with Elena Rostova\'s fingerprints!'
      }
    ],
    culprit: 'Elena Rostova',
    deductionNote: 'Marco was stationed at the grinder, and Julian Vance was on the phone outdoors. Forensics found the poison bottle directly matching Elena Rostova\'s fingerprints!'
  },
  {
    id: 'midnight_express',
    round: 5,
    title: 'THE MIDNIGHT EXPRESS HEIST',
    location: 'STATION',
    locationIcon: '🚉',
    story: 'A diplomatic briefcase was swapped with counterfeit papers aboard the midnight express train.',
    question: 'Who used the security override keycard to enter the courier cabin and swap the briefcase?',
    howToSolve: 'Arthur had the authentic briefcase at boarding. Nadia exited into the street. Officer Kyle opened the lock!',
    suspects: [
      {
        id: 'arthur',
        name: 'Arthur Pendelton',
        avatar: '💼',
        role: 'Diplomatic Courier',
        description: 'Designated carrier for state secrets.'
      },
      {
        id: 'nadia',
        name: 'Nadia Petrova',
        avatar: '📸',
        role: 'Foreign Reporter',
        description: 'Boarded without luggage. Seen taking photos on the platform.'
      },
      {
        id: 'kyle',
        name: 'Officer Kyle',
        avatar: '👮',
        role: 'Transit Police Officer',
        description: 'Carried electronic master passcards for all passenger cabins.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Platform Arrival Clock',
        location: 'STATION',
        icon: '🕒',
        text: 'The midnight express train pulled onto Platform 4 at exactly 12:05 AM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Baggage Scanner X-Ray',
        location: 'BANK',
        icon: '📦',
        text: 'X-ray scans prove Arthur Pendelton boarded at 12:06 AM with the authentic sealed briefcase intact (Alibi verified).'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Exit Turnstile Scanner',
        location: 'CAFE',
        icon: '🎫',
        text: 'Ticket barriers record Nadia Petrova scanned out to the street square at 12:07 AM (Alibi verified).'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Cabin Electronic Deadbolt',
        location: 'HOTEL',
        icon: '🔑',
        text: 'The courier cabin lock was overridden at 12:08 AM using security badge #402 issued to Officer Kyle!'
      }
    ],
    culprit: 'Officer Kyle',
    deductionNote: 'Arthur had the real documents at boarding, and Nadia had already scanned out to the street. The compartment lock was overridden at 12:08 AM using Officer Kyle\'s security badge!'
  },
  {
    id: 'cyber_vault_breach',
    round: 6,
    title: 'THE CYBER VAULT BREACH',
    location: 'BANK',
    locationIcon: '🏦',
    story: 'An encrypted quantum storage drive was extracted from the subterranean vault during routine maintenance.',
    question: 'Who unbolted the air intake duct behind the vault to extract the quantum storage drive?',
    howToSolve: 'Dr. Thorne was sealed in the cleanroom. Maya Lin was typing in Room 204. Vincent Cross\'s wrench unbolted the vent!',
    suspects: [
      {
        id: 'aris',
        name: 'Dr. Aris Thorne',
        avatar: '🔬',
        role: 'Quantum Physicist',
        description: 'Created the drive hardware. Works in the cleanroom.'
      },
      {
        id: 'maya',
        name: 'Maya Lin',
        avatar: '💻',
        role: 'Cybersecurity Auditor',
        description: 'Conducted network penetration tests from the console room.'
      },
      {
        id: 'vincent',
        name: 'Vincent Cross',
        avatar: '🕶️',
        role: 'Facility Operations Lead',
        description: 'Maintains vault mechanical vents. Carries custom hydraulic tools.'
      }
    ],
    clues: [
      {
        id: 'c1',
        num: '01',
        title: 'Vault Cabinet Sensor',
        location: 'BANK',
        icon: '🗄️',
        text: 'The quantum vault cabinet was forced open through the back air intake duct at 2:40 AM.'
      },
      {
        id: 'c2',
        num: '02',
        title: 'Cleanroom Airlock Record',
        location: 'MUSEUM',
        icon: '🧬',
        text: 'Airlock biosensors confirm Dr. Aris Thorne was sealed inside the cleanroom until 3:00 AM (Alibi verified).'
      },
      {
        id: 'c3',
        num: '03',
        title: 'Console Keystroke Log',
        location: 'HOTEL',
        icon: '⌨️',
        text: 'Server logs confirm Maya Lin was actively typing commands in Room 204 from 2:35 to 2:45 AM (Alibi verified).'
      },
      {
        id: 'c4',
        num: '04',
        title: 'Ventilation Hatch Tool Marks',
        location: 'STATION',
        icon: '🔧',
        text: 'Forensic tool analysis proves the duct bolts were unbolted using a wrench labeled with Vincent Cross\'s serial number!'
      }
    ],
    culprit: 'Vincent Cross',
    deductionNote: 'Dr. Thorne was sealed in the cleanroom, and Maya Lin was logged typing in Room 204. The mechanical duct breach behind the vault was executed using Vincent Cross\'s wrench!'
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
