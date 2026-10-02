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
    round: 1,
    title: 'THE MISSING DIAMOND',
    location: 'MUSEUM',
    locationIcon: '🏛',
    story: 'A priceless diamond disappeared during a private museum event. Three people were near the exhibition room.',
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
  }
];

export const getCaseByRound = (roundNumber) => {
  return CASES.find((c) => c.round === roundNumber) || CASES[0];
};
