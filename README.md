# 🕵️ SPY HUNT — Real-Time Multiplayer Detective Mystery Game

> *"Find the culprit before time runs out."*  
> **2–8 players • 3 mysteries • Real-time multiplayer**

---

## 🚀 Live Production Game URL & Repository
- **Production Live URL**: [https://sonyyash78.github.io/Project/](https://sonyyash78.github.io/Project/)
- **GitHub Repository**: [https://github.com/sonyyash78/Project](https://github.com/sonyyash78/Project)

---

## 🎯 Game Overview & Core Features

SPY HUNT is a polished, fast-paced 2–8 player detective mystery game. Players join the same investigation room with custom detective characters and race against a synchronized 30-second clock to inspect clues across an interactive city map and deduce the true culprit.

### 🔍 1. Complete Detective Mystery Flow
1. **Home Screen**: Elegant detective dossier aesthetic with Create Room & Join Room actions.
2. **Identity & Detective Selection**: Choose your detective alias and select from 5 distinct cosmetic detective characters:
   - 🕵️ **Detective** (*The Sleuth*) — "Expert at connecting evidence."
   - 🔍 **Investigator** (*The Forensic*) — "Master of physical clues."
   - 💻 **Hacker** (*Cyber Watch*) — "Specialist in digital clues."
   - 🔬 **Scientist** (*The Pathologist*) — "Analyzes forensic records."
   - 🕶️ **Agent** (*Operative Shadow*) — "Covert surveillance specialist."
3. **Multiplayer Lobby**:
   - Unique 5-character room code (e.g., `SH7K9`).
   - Real-time roster showing 2 to 8 connected detectives with avatars, names, and Host badge.
   - 1-click **Copy Room Code**, **Copy Shareable Link** (`?room=CODE`), and instant **"Open 2nd Detective Tab"** test launcher.
   - Host-gated start requiring at least 2 players.
4. **Interactive 2D City Investigation Map**:
   - 5 connected crime scene locations:
     - 🏛 **MUSEUM** (Exhibition & Historical Archives)
     - 🏦 **BANK** (Vault & Financial Terminal)
     - 🏨 **HOTEL** (Grand Central Suites & Lobbies)
     - 🚉 **STATION** (Metro Junction & Cargo Platforms)
     - ☕ **CAFE** (Roastery & Public Lounge)
   - Clickable locations to uncover specific evidence leads.
5. **3 Playable Mystery Cases (3 Playable Rounds)**:
   - **Case 1: The Missing Diamond** (Location: Museum, Culprit: Marcus Lee)
   - **Case 2: The Hotel Blackout** (Location: Hotel, Culprit: Daniel Roy)
   - **Case 3: The Stolen Painting** (Location: Bank, Culprit: Victor)
6. **Case Clues & Suspect Selection**:
   - 4 clear, logically deducible clue cards per case (e.g. `EVIDENCE #01 Security Log`).
   - 3 suspect cards per case. Selecting a suspect triggers **ANSWER LOCKED** to prevent answer changing.
7. **Synchronized 30-Second Timer**:
   - Large HUD countdown clock (`00:30` to `00:00`) synchronized across all players.
   - Automatically locks answers when timer hits 0.
8. **Scoring & Deductions**:
   - Correct deduction: **100 points** + time speed bonus.
   - Incorrect or unanswered: **0 points**.
   - Server/host authoritative scoring to prevent duplicate scoring or cheating.
9. **Round Results & Live Leaderboard**:
   - Culprit reveal with logical case deduction explanation.
   - Individual outcome indicator (✓ Correct or ✕ Incorrect).
   - Live round standings table before transitioning to the next mystery.
10. **Final Results & All-Time Archives**:
    - Grand Case Closed podium declaring the champion detective.
    - Full match breakdown table of cases solved and points scored.
    - **PLAY AGAIN** (resets to Case 1) and **RETURN TO LOBBY** actions.
    - Persistent **Hall of Master Detectives** leaderboard stored in `localStorage`.
11. **Disconnect & Host Migration**:
    - Disconnect events are handled smoothly without crashing the room.
    - Automatic Host migration to the next active detective if the host leaves.

---

## 🕹️ Controls & Accessibility
- **Desktop & Laptop**: Mouse/Trackpad point-and-click on map locations, clues, and suspect dossiers.
- **Mobile & Tablet**: Touch-optimized cards, responsive map, and quick tap suspect accusations.
- **Audio**: Web Audio API synthesized typewriter clicks, timer ticks, answer locks, and victory fanfares with toggle control.

---

## 🛠️ Local Development & Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/sonyyash78/Project.git
cd Project

# 2. Install dependencies & build
cd frontend
npm install
npm run build

# 3. Preview locally
npm run preview
```
