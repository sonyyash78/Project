# ⚔️ Cyber Duel 2P — Real-Time Multiplayer Arena

A fast-paced, 2-player competitive real-time web arena built with **React 19**, **Vite**, **HTML5 Canvas**, and **WebRTC (PeerJS) / BroadcastChannel**.

---

## 🚀 Deployed Public URL & Verification
- **GitHub Repository**: [https://github.com/sonyyash78/Project](https://github.com/sonyyash78/Project)
- **Production Live URL (GitHub Pages)**: [https://sonyyash78.github.io/Project/](https://sonyyash78.github.io/Project/)

---

## 🎯 12 Prioritized Core Deliverables

| # | Requirement | Implementation Details |
|---|---|---|
| **1** | **Real Multiplayer** | Direct browser-to-browser P2P networking via **WebRTC DataChannels (PeerJS)** with automatic **BroadcastChannel** fallback for zero-latency local tab testing. |
| **2** | **Create / Join Room** | Host generates a unique 6-character room code (e.g., `NEON-482`) with 1-click **Copy Room Code**, **Copy Shareable Link** (`?room=CODE`), and instant 2-player test launcher. Peers enter room code or click invite links to join immediately. |
| **3** | **2-Player Synchronization** | 60 FPS requestAnimationFrame canvas loop synchronizing player positions, velocity vectors, dash states, and collision coordinates with linear interpolation (lerp). |
| **4** | **3 Playable Rounds** | Structured match flow with exactly 3 rounds. Round-by-round recap dialogs, 3-second intermission countdowns, and a final Grand Champion declaration with full 3-round scorecard. |
| **5** | **Timer** | Prominent HUD round timer counting down synchronously from 30 seconds to 0 with low-time warning pulses and audio alerts. |
| **6** | **Scoring** | Real-time score tallies (+10 for standard energy orbs, +25 for golden super stars). Displays floating score popups and tracks round wins (⭐). |
| **7** | **Leaderboard** | Live in-game round scorecard plus persistent **All-Time Hall of Fame Leaderboard** stored in `localStorage` tracking Wins, Matches, High Score, and Win Rate. |
| **8** | **Basic Map** | 800×500 tactical cyber arena featuring glowing neon perimeter boundaries, 6 geometric barrier obstacles with circle-to-box collision physics, and dynamic spawning collectible orbs. |
| **9** | **Character Selection** | 4 distinct combat heroes with unique attributes: **⚡ VOLT** (Speedster, +20% move speed), **🛡️ AEGIS** (Titan Guardian, 2x magnet collection aura), **🔥 PYRO** (Solar Striker, turbo dash burst), and **👻 PHANTOM** (Void Weaver, phase glide handling). |
| **10** | **GitHub** | Version controlled with clean commits pushed to GitHub repository `sonyyash78/Project`. |
| **11** | **Production Deployment** | Automated CI/CD pipeline via GitHub Actions deploying static production build to GitHub Pages and Vercel configuration. |
| **12** | **Public URL Verification** | Publicly accessible production URL with verified HTTP 200 responses, interactive room joining, and gameplay functionality. |

---

## 🕹️ Controls

- **Desktop (Keyboard)**:
  - `W` / `A` / `S` / `D` or `Arrow Keys`: Move player
  - `Spacebar`: Turbo Dash burst (Cooldown: 2s)
- **Mobile (Touch)**:
  - On-screen 4-way D-Pad + Dedicated **⚡ DASH** action button

---

## 🛠️ Local Development & Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/sonyyash78/Project.git
cd Project

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Start local development server
npm run dev

# 4. Or build and preview production bundle
npm run build
npm run preview
```
