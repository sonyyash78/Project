import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CHARACTERS, getCharacterById } from '../game/characters';
import { MAP_CONFIG, generateOrbs, resolveObstacleCollisions } from '../game/map';
import { NetworkManager } from '../game/network';
import { SoundFX } from '../game/sound';
import { getLeaderboard, recordMatchResult, resetLeaderboard } from '../game/leaderboard';

export default function MultiplayerArena() {
  // Navigation / Phase states
  // Phases: 'LOBBY' | 'WAITING' | 'COUNTDOWN' | 'PLAYING' | 'ROUND_RECAP' | 'MATCH_OVER'
  const [gamePhase, setGamePhase] = useState('LOBBY');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Player & Room setup
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('CYBER_PLAYER_NAME') || `Player_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [selectedCharId, setSelectedCharId] = useState('volt');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [activeRoomId, setActiveRoomId] = useState('');
  const [playerRole, setPlayerRole] = useState('host'); // 'host' | 'client'
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');
  const [copyNotice, setCopyNotice] = useState('');

  // Opponent info
  const [opponent, setOpponent] = useState({
    name: 'Opponent',
    character: 'aegis',
    connected: false
  });

  // Game match state
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(MAP_CONFIG.roundDuration);
  const [scores, setScores] = useState({ p1: 0, p2: 0 }); // Current round scores
  const [roundWins, setRoundWins] = useState({ p1: 0, p2: 0 }); // Wins per player
  const [roundsHistory, setRoundsHistory] = useState([]); // [{ round: 1, p1Score, p2Score, winner }]
  const [intermissionCount, setIntermissionCount] = useState(3);
  const [matchWinner, setMatchWinner] = useState(null);

  // Canvas & Game loop refs
  const canvasRef = useRef(null);
  const networkRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Active game physics entities
  const p1Ref = useRef({
    x: MAP_CONFIG.spawns.p1.x,
    y: MAP_CONFIG.spawns.p1.y,
    vx: 0,
    vy: 0,
    charId: 'volt',
    name: 'P1',
    isDashing: false,
    dashCooldown: 0
  });

  const p2Ref = useRef({
    x: MAP_CONFIG.spawns.p2.x,
    y: MAP_CONFIG.spawns.p2.y,
    vx: 0,
    vy: 0,
    charId: 'aegis',
    name: 'P2',
    isDashing: false,
    dashCooldown: 0
  });

  const orbsRef = useRef([]);
  const keysDownRef = useRef({});
  const floatingTextsRef = useRef([]); // Floating score text indicators (+10, +25)

  // Load leaderboard on initial mount & check URL params for ?room=CODE
  useEffect(() => {
    setLeaderboardData(getLeaderboard());

    const searchStr = window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(searchStr);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomIdInput(roomParam.toUpperCase());
    }
  }, []);

  // Sync nickname with localStorage
  const handleNameChange = (name) => {
    setPlayerName(name);
    localStorage.setItem('CYBER_PLAYER_NAME', name);
  };

  // ----------------------------------------------------
  // SOUND WRAPPER
  // ----------------------------------------------------
  const playSfx = useCallback((type, ...args) => {
    if (!soundEnabled) return;
    if (type === 'orb') SoundFX.orbCollect(...args);
    if (type === 'dash') SoundFX.dash(...args);
    if (type === 'tick') SoundFX.tick(...args);
    if (type === 'roundWin') SoundFX.roundWin(...args);
    if (type === 'victory') SoundFX.victory(...args);
  }, [soundEnabled]);

  // ----------------------------------------------------
  // NETWORK & MESSAGE HANDLING
  // ----------------------------------------------------
  const handleNetworkMessage = useCallback((packet) => {
    if (!packet || typeof packet !== 'object') return;

    switch (packet.type) {
      case 'HANDSHAKE':
      case 'CLIENT_HELLO':
      case 'HOST_WELCOME':
        setOpponent({
          name: packet.playerName || 'Rival',
          character: packet.character || 'aegis',
          connected: true
        });
        if (playerRole === 'host') {
          p2Ref.current.charId = packet.character || 'aegis';
          p2Ref.current.name = packet.playerName || 'P2';
        } else {
          p1Ref.current.charId = packet.character || 'volt';
          p1Ref.current.name = packet.playerName || 'P1';
        }
        break;

      case 'START_MATCH':
        // Host started match
        setCurrentRound(1);
        setRoundWins({ p1: 0, p2: 0 });
        setRoundsHistory([]);
        setMatchWinner(null);
        startRoundSequence(1, packet.orbsSeed);
        break;

      case 'START_ROUND':
        startRoundSequence(packet.round, packet.orbsSeed);
        break;

      case 'SYNC_POS':
        // Opponent movement update
        if (playerRole === 'host') {
          p2Ref.current.x = packet.x;
          p2Ref.current.y = packet.y;
          p2Ref.current.vx = packet.vx;
          p2Ref.current.vy = packet.vy;
          p2Ref.current.isDashing = packet.isDashing;
        } else {
          p1Ref.current.x = packet.x;
          p1Ref.current.y = packet.y;
          p1Ref.current.vx = packet.vx;
          p1Ref.current.vy = packet.vy;
          p1Ref.current.isDashing = packet.isDashing;
        }
        break;

      case 'ORB_COLLECTED':
        // Remove orb and credit score
        orbsRef.current = orbsRef.current.filter((o) => o.id !== packet.orbId);
        setScores((prev) => {
          const next = { ...prev };
          if (packet.collector === 'p1') next.p1 += packet.points;
          else next.p2 += packet.points;
          return next;
        });

        floatingTextsRef.current.push({
          x: packet.x,
          y: packet.y,
          text: `+${packet.points}`,
          color: packet.points > 10 ? '#fbbf24' : '#38bdf8',
          alpha: 1.0,
          vy: -1.2
        });

        playSfx('orb', packet.points > 10);
        break;

      case 'CLOCK_TICK':
        setTimeRemaining(packet.time);
        if (packet.time <= 5 && packet.time > 0) {
          playSfx('tick', true);
        }
        break;

      case 'ROUND_OVER':
        handleRoundFinished(packet.round, packet.winner, packet.p1Score, packet.p2Score);
        break;

      case 'MATCH_OVER':
        handleMatchFinished(packet.winner, packet.history);
        break;

      case 'REMATCH_REQ':
        if (playerRole === 'host') {
          triggerStartMatch();
        }
        break;

      default:
        break;
    }
  }, [playerRole, playSfx]);

  // ----------------------------------------------------
  // ROOM CREATION & JOINING
  // ----------------------------------------------------
  const handleCreateRoom = () => {
    const code = 'NEON' + Math.floor(100 + Math.random() * 900);
    setActiveRoomId(code);
    setPlayerRole('host');
    p1Ref.current.charId = selectedCharId;
    p1Ref.current.name = playerName;

    initNetworking(code, 'host');
    setGamePhase('WAITING');
  };

  const handleJoinRoom = () => {
    if (!roomIdInput.trim()) return;
    const code = roomIdInput.trim().toUpperCase();
    setActiveRoomId(code);
    setPlayerRole('client');
    p2Ref.current.charId = selectedCharId;
    p2Ref.current.name = playerName;

    initNetworking(code, 'client');
    setGamePhase('WAITING');
  };

  const initNetworking = (roomId, role) => {
    if (networkRef.current) {
      networkRef.current.destroy();
    }

    networkRef.current = new NetworkManager({
      roomId,
      role,
      playerName,
      character: selectedCharId,
      onMessage: (data) => handleNetworkMessage(data),
      onStatusChange: ({ status, isConnected }) => {
        setConnectionStatus(status);
        if (isConnected) {
          setOpponent((prev) => ({ ...prev, connected: true }));
        }
      }
    });
  };

  // Copy room link / code helper
  const copyRoomLink = () => {
    const link = `${window.location.origin}${window.location.pathname}#/?room=${activeRoomId}`;
    navigator.clipboard.writeText(link);
    setCopyNotice('Link Copied to Clipboard!');
    setTimeout(() => setCopyNotice(''), 2500);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(activeRoomId);
    setCopyNotice('Room Code Copied!');
    setTimeout(() => setCopyNotice(''), 2500);
  };

  const openSecondTab = () => {
    const link = `${window.location.origin}${window.location.pathname}#/?room=${activeRoomId}`;
    window.open(link, '_blank');
  };

  // ----------------------------------------------------
  // ROUND & MATCH PROGRESSION (3 PLAYABLE ROUNDS)
  // ----------------------------------------------------
  const triggerStartMatch = () => {
    const seed = Date.now();
    networkRef.current?.send({
      type: 'START_MATCH',
      orbsSeed: seed
    });
    setCurrentRound(1);
    setRoundWins({ p1: 0, p2: 0 });
    setRoundsHistory([]);
    setMatchWinner(null);
    startRoundSequence(1, seed);
  };

  const startRoundSequence = (roundNum, seed = Date.now()) => {
    setCurrentRound(roundNum);
    setScores({ p1: 0, p2: 0 });
    setTimeRemaining(MAP_CONFIG.roundDuration);

    // Reset player positions
    p1Ref.current.x = MAP_CONFIG.spawns.p1.x;
    p1Ref.current.y = MAP_CONFIG.spawns.p1.y;
    p1Ref.current.vx = 0;
    p1Ref.current.vy = 0;

    p2Ref.current.x = MAP_CONFIG.spawns.p2.x;
    p2Ref.current.y = MAP_CONFIG.spawns.p2.y;
    p2Ref.current.vx = 0;
    p2Ref.current.vy = 0;

    // Generate balanced orbs
    orbsRef.current = generateOrbs(16, seed + roundNum * 100);

    // Countdown sequence before movement unlocks
    setIntermissionCount(3);
    setGamePhase('COUNTDOWN');

    let count = 3;
    const cdInterval = setInterval(() => {
      count -= 1;
      playSfx('tick', false);
      setIntermissionCount(count);
      if (count <= 0) {
        clearInterval(cdInterval);
        setGamePhase('PLAYING');
        if (playerRole === 'host') {
          startHostGameTimer(roundNum);
        }
      }
    }, 1000);
  };

  // Host runs authoritative clock
  const startHostGameTimer = (roundNum) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    let timeLeft = MAP_CONFIG.roundDuration;
    timerIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setTimeRemaining(timeLeft);

      networkRef.current?.send({
        type: 'CLOCK_TICK',
        time: timeLeft
      });

      if (timeLeft <= 5 && timeLeft > 0) {
        playSfx('tick', true);
      }

      if (timeLeft <= 0) {
        clearInterval(timerIntervalRef.current);
        onHostRoundEnd(roundNum);
      }
    }, 1000);
  };

  const onHostRoundEnd = (roundNum) => {
    setScores((latestScores) => {
      let winner = 'draw';
      if (latestScores.p1 > latestScores.p2) winner = 'p1';
      else if (latestScores.p2 > latestScores.p1) winner = 'p2';

      networkRef.current?.send({
        type: 'ROUND_OVER',
        round: roundNum,
        winner,
        p1Score: latestScores.p1,
        p2Score: latestScores.p2
      });

      handleRoundFinished(roundNum, winner, latestScores.p1, latestScores.p2);
      return latestScores;
    });
  };

  const handleRoundFinished = (roundNum, winner, p1Final, p2Final) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    playSfx('roundWin');

    const nextWins = { ...roundWins };
    if (winner === 'p1') nextWins.p1 += 1;
    if (winner === 'p2') nextWins.p2 += 1;
    setRoundWins(nextWins);

    const historyEntry = {
      round: roundNum,
      p1Score: p1Final,
      p2Score: p2Final,
      winner
    };
    const nextHistory = [...roundsHistory, historyEntry];
    setRoundsHistory(nextHistory);

    setGamePhase('ROUND_RECAP');

    // Check if 3 playable rounds reached
    if (roundNum >= MAP_CONFIG.totalRounds) {
      setTimeout(() => {
        let champion = 'draw';
        if (nextWins.p1 > nextWins.p2) champion = 'p1';
        else if (nextWins.p2 > nextWins.p1) champion = 'p2';
        else {
          // Tiebreaker on total aggregate score
          const totalP1 = nextHistory.reduce((sum, h) => sum + h.p1Score, 0);
          const totalP2 = nextHistory.reduce((sum, h) => sum + h.p2Score, 0);
          if (totalP1 > totalP2) champion = 'p1';
          else if (totalP2 > totalP1) champion = 'p2';
        }

        if (playerRole === 'host') {
          networkRef.current?.send({
            type: 'MATCH_OVER',
            winner: champion,
            history: nextHistory
          });
        }
        handleMatchFinished(champion, nextHistory);
      }, 3500);
    } else {
      // 3.5s intermission before next round
      setTimeout(() => {
        if (playerRole === 'host') {
          const nextSeed = Date.now();
          networkRef.current?.send({
            type: 'START_ROUND',
            round: roundNum + 1,
            orbsSeed: nextSeed
          });
          startRoundSequence(roundNum + 1, nextSeed);
        }
      }, 3500);
    }
  };

  const handleMatchFinished = (champion, history) => {
    setMatchWinner(champion);
    setGamePhase('MATCH_OVER');
    playSfx('victory');

    // Record to global leaderboard
    const totalP1 = history.reduce((sum, h) => sum + h.p1Score, 0);
    const totalP2 = history.reduce((sum, h) => sum + h.p2Score, 0);

    const p1Data = {
      name: playerRole === 'host' ? playerName : opponent.name,
      character: playerRole === 'host' ? selectedCharId : opponent.character,
      totalScore: totalP1
    };
    const p2Data = {
      name: playerRole === 'client' ? playerName : opponent.name,
      character: playerRole === 'client' ? selectedCharId : opponent.character,
      totalScore: totalP2
    };

    const updated = recordMatchResult({
      winner: champion,
      p1: p1Data,
      p2: p2Data,
      roundsData: history
    });
    setLeaderboardData(updated);
  };

  // ----------------------------------------------------
  // INPUT HANDLING (KEYBOARD & BUTTONS)
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysDownRef.current[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key === 'Spacebar') {
        triggerDash();
      }
    };
    const handleKeyUp = (e) => {
      keysDownRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const triggerDash = () => {
    const localEntity = playerRole === 'host' ? p1Ref.current : p2Ref.current;
    if (localEntity.dashCooldown <= 0) {
      localEntity.isDashing = true;
      localEntity.dashCooldown = 120; // 2s cooldown at 60fps
      playSfx('dash');
      setTimeout(() => {
        localEntity.isDashing = false;
      }, 250);
    }
  };

  // Mobile virtual directional input handler
  const handleVirtualDir = (dir, isDown) => {
    if (dir === 'up') keysDownRef.current['w'] = isDown;
    if (dir === 'down') keysDownRef.current['s'] = isDown;
    if (dir === 'left') keysDownRef.current['a'] = isDown;
    if (dir === 'right') keysDownRef.current['d'] = isDown;
  };

  // ----------------------------------------------------
  // 60FPS GAME LOOP & CANVAS RENDERING
  // ----------------------------------------------------
  useEffect(() => {
    let lastNetworkSync = 0;

    const gameLoop = (timestamp) => {
      const canvas = canvasRef.current;
      if (canvas && gamePhase === 'PLAYING') {
        const ctx = canvas.getContext('2d');
        const myChar = getCharacterById(selectedCharId);
        const localEntity = playerRole === 'host' ? p1Ref.current : p2Ref.current;

        // 1. Process movement inputs
        let dx = 0;
        let dy = 0;
        const keys = keysDownRef.current;

        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        if (dx !== 0 && dy !== 0) {
          const invSqrt2 = 0.7071;
          dx *= invSqrt2;
          dy *= invSqrt2;
        }

        let currentSpeed = myChar.speed;
        if (localEntity.isDashing) {
          currentSpeed *= myChar.dashBoost || 1.6;
        }
        if (localEntity.dashCooldown > 0) {
          localEntity.dashCooldown -= 1;
        }

        localEntity.vx = dx * currentSpeed;
        localEntity.vy = dy * currentSpeed;

        localEntity.x += localEntity.vx;
        localEntity.y += localEntity.vy;

        // Obstacle & boundary collision
        const resolved = resolveObstacleCollisions(localEntity.x, localEntity.y, myChar.radius);
        localEntity.x = resolved.x;
        localEntity.y = resolved.y;

        // 2. Broadcast position at ~30Hz
        if (timestamp - lastNetworkSync > 33) {
          lastNetworkSync = timestamp;
          networkRef.current?.send({
            type: 'SYNC_POS',
            x: localEntity.x,
            y: localEntity.y,
            vx: localEntity.vx,
            vy: localEntity.vy,
            isDashing: localEntity.isDashing
          });
        }

        // 3. Orb collection check (magnet attraction + pickup)
        const magnetDist = myChar.magnetRadius || 30;
        const pickupRadius = myChar.radius + 6;

        orbsRef.current.forEach((orb) => {
          const dist = Math.hypot(orb.x - localEntity.x, orb.y - localEntity.y);

          // Magnet pull effect
          if (dist < magnetDist && dist > pickupRadius) {
            const pullSpeed = 2.4;
            orb.x += ((localEntity.x - orb.x) / dist) * pullSpeed;
            orb.y += ((localEntity.y - orb.y) / dist) * pullSpeed;
          }

          // Collection trigger
          if (dist <= pickupRadius) {
            const collectorKey = playerRole === 'host' ? 'p1' : 'p2';
            orbsRef.current = orbsRef.current.filter((o) => o.id !== orb.id);

            setScores((prev) => ({
              ...prev,
              [collectorKey]: prev[collectorKey] + orb.points
            }));

            floatingTextsRef.current.push({
              x: orb.x,
              y: orb.y,
              text: `+${orb.points}`,
              color: orb.points > 10 ? '#fbbf24' : '#38bdf8',
              alpha: 1.0,
              vy: -1.2
            });

            playSfx('orb', orb.points > 10);

            networkRef.current?.send({
              type: 'ORB_COLLECTED',
              orbId: orb.id,
              collector: collectorKey,
              points: orb.points,
              x: orb.x,
              y: orb.y
            });
          }
        });

        // 4. Render frame
        renderCanvas(ctx);
      } else if (canvas) {
        // Draw static arena preview in lobby / countdown / recap
        const ctx = canvas.getContext('2d');
        renderCanvas(ctx);
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gamePhase, selectedCharId, playerRole, playSfx]);

  // Canvas drawing routine
  const renderCanvas = (ctx) => {
    const W = MAP_CONFIG.width;
    const H = MAP_CONFIG.height;

    // Clear background
    ctx.fillStyle = '#060a17';
    ctx.fillRect(0, 0, W, H);

    // Neon grid pattern
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= W; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Outer neon arena boundaries
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    // Render obstacles
    MAP_CONFIG.obstacles.forEach((obs) => {
      // Barrier fill
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      // Barrier neon glow border
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

      // Inner tactical stripes
      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.fillRect(obs.x + 3, obs.y + 3, obs.width - 6, obs.height - 6);
    });

    // Render orbs
    orbsRef.current.forEach((orb) => {
      const isGold = orb.type === 'golden';
      ctx.save();
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);

      // Glow halo
      ctx.shadowColor = isGold ? '#fbbf24' : '#38bdf8';
      ctx.shadowBlur = isGold ? 16 : 10;
      ctx.fillStyle = isGold ? '#f59e0b' : '#0284c7';
      ctx.fill();

      // Shiny core
      ctx.beginPath();
      ctx.arc(orb.x - 2, orb.y - 2, orb.radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    });

    // Render Player 1
    const p1Char = getCharacterById(p1Ref.current.charId);
    drawPlayerAvatar(ctx, p1Ref.current, p1Char, 'P1 - ' + (playerRole === 'host' ? playerName : opponent.name), '#38bdf8');

    // Render Player 2
    const p2Char = getCharacterById(p2Ref.current.charId);
    drawPlayerAvatar(ctx, p2Ref.current, p2Char, 'P2 - ' + (playerRole === 'client' ? playerName : opponent.name), '#f43f5e');

    // Render floating score indicators (+10 / +25)
    floatingTextsRef.current.forEach((ft, index) => {
      ctx.save();
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillText(ft.text, ft.x - 10, ft.y);
      ctx.restore();

      ft.y += ft.vy;
      ft.alpha -= 0.025;
      if (ft.alpha <= 0) {
        floatingTextsRef.current.splice(index, 1);
      }
    });
  };

  const drawPlayerAvatar = (ctx, entity, charInfo, label, themeColor) => {
    ctx.save();

    // Dash trail / aura
    if (entity.isDashing) {
      ctx.beginPath();
      ctx.arc(entity.x - entity.vx * 2, entity.y - entity.vy * 2, charInfo.radius * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
    }

    // Outer glow
    ctx.shadowColor = charInfo.color;
    ctx.shadowBlur = 18;

    // Body circle
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, charInfo.radius, 0, Math.PI * 2);
    ctx.fillStyle = charInfo.color;
    ctx.fill();

    // Inner ring
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Character icon
    ctx.shadowBlur = 0;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(charInfo.icon, entity.x, entity.y);

    // Player label tag above
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(label, entity.x, entity.y - charInfo.radius - 8);

    ctx.restore();
  };

  // ----------------------------------------------------
  // UI RENDER
  // ----------------------------------------------------
  const currentChar = getCharacterById(selectedCharId);

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Header / Bar */}
      <header className="border-b border-indigo-500/20 bg-slate-950/80 backdrop-blur-xl px-4 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div>
              <h1 className="text-lg font-black tracking-wider bg-gradient-to-r from-cyan-400 via-indigo-400 to-rose-400 bg-clip-text text-transparent">
                CYBER DUEL 2P
              </h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                Real-Time 3-Round Arena Battle
              </p>
            </div>
          </div>

          {/* Quick HUD controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 text-xs hover:border-slate-500 transition-colors"
              title="Toggle Audio"
            >
              {soundEnabled ? '🔊 SFX On' : '🔇 SFX Off'}
            </button>

            <button
              onClick={() => setShowLeaderboard(true)}
              className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold text-xs hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
            >
              🏆 Leaderboard
            </button>

            {gamePhase !== 'LOBBY' && (
              <button
                onClick={() => {
                  networkRef.current?.destroy();
                  setGamePhase('LOBBY');
                }}
                className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs hover:bg-rose-500/20 transition-all"
              >
                Leave Match
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col items-center justify-center">
        {/* ========================================================= */}
        {/* PHASE 1: LOBBY & CHARACTER SELECTION                      */}
        {/* ========================================================= */}
        {gamePhase === 'LOBBY' && (
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto">
            {/* Character Selection (Left column) */}
            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <span>👤</span> Select Your Hero
                </h2>
                <span className="text-xs text-slate-400">4 Champions</span>
              </div>

              {/* Character cards grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {CHARACTERS.map((char) => {
                  const isSelected = char.id === selectedCharId;
                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedCharId(char.id)}
                      className={`relative cursor-pointer rounded-2xl p-4 border transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.25)] scale-[1.02]'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-3xl">{char.icon}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500 text-black">
                            Selected
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-sm text-white tracking-wide">{char.name}</h3>
                      <p className="text-[11px] text-slate-400 mb-2">{char.title}</p>
                      <p className="text-[10px] text-cyan-300/90 font-medium">{char.trait}</p>
                    </div>
                  );
                })}
              </div>

              {/* Selected Character Preview Stats */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Character Specialization:</span>
                  <span className="font-bold text-white">{currentChar.name}</span>
                </div>
                <p className="text-xs text-slate-300 italic mb-3">"{currentChar.bio}"</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Velocity</span>
                      <span className="text-cyan-400 font-mono font-bold">{currentChar.stats.speed}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${currentChar.stats.speed}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Magnet Attraction</span>
                      <span className="text-indigo-400 font-mono font-bold">{currentChar.stats.magnet}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${currentChar.stats.magnet}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Room Lobby (Right column) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Profile Card */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Your Combat Tag
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="Enter Nickname"
                />
              </div>

              {/* Match Connection Card */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
                    <span>🌐</span> Real-Time Multiplayer
                  </h3>

                  {/* Create Room Button */}
                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 font-black text-sm text-white shadow-lg hover:shadow-cyan-500/25 hover:brightness-110 active:scale-[0.98] transition-all mb-4 flex items-center justify-center gap-2"
                  >
                    <span>⚡</span> Create Match Room
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink mx-3 text-slate-500 text-xs uppercase font-bold">OR JOIN ROOM</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>

                  {/* Join Room Input & Button */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      maxLength={10}
                      value={roomIdInput}
                      onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                      placeholder="ENTER ROOM CODE"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={handleJoinRoom}
                      disabled={!roomIdInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs text-white transition-all shadow"
                    >
                      Join
                    </button>
                  </div>
                </div>

                {/* Rules highlight */}
                <div className="mt-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">📋 Match Rules:</div>
                  <div>• 3 Fast-Paced Playable Rounds (30s each)</div>
                  <div>• Collect Energy Orbs (+10) & Super Stars (+25)</div>
                  <div>• Most round wins claims the Cyber Trophy!</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 2: WAITING ROOM                                     */}
        {/* ========================================================= */}
        {gamePhase === 'WAITING' && (
          <div className="w-full max-w-lg bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl text-center my-auto">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-3xl mb-4 animate-pulse">
              📡
            </div>

            <h2 className="text-xl font-black text-white mb-1">
              {playerRole === 'host' ? 'Room Created!' : 'Connecting to Room...'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              {playerRole === 'host'
                ? 'Share the room code or link with your opponent to initiate duel'
                : 'Synchronizing with host player over real-time network...'}
            </p>

            {/* Room Code Display */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-5">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                Room Access Code
              </span>
              <div className="text-3xl font-black font-mono tracking-widest text-cyan-400 select-all">
                {activeRoomId}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 mb-6">
              <button
                onClick={copyRoomCode}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5"
              >
                📋 Copy Code
              </button>
              <button
                onClick={copyRoomLink}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5"
              >
                🔗 Copy Invite Link
              </button>
            </div>

            {/* Test 2-Player Dual Tab Helper */}
            {playerRole === 'host' && (
              <div className="mb-6 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-left flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-cyan-300">Quick 2-Player Test:</div>
                  <div className="text-[11px] text-slate-400">Launch second player in another window</div>
                </div>
                <button
                  onClick={openSecondTab}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow transition-all"
                >
                  Open 2nd Tab
                </button>
              </div>
            )}

            {/* Players Status Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Player 1 (Host) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] font-bold uppercase text-cyan-400">Player 1 (Host)</span>
                </div>
                <div className="font-bold text-xs text-white truncate">
                  {playerRole === 'host' ? playerName : opponent.name}
                </div>
                <div className="text-[10px] text-slate-400">
                  Hero: {playerRole === 'host' ? currentChar.name : opponent.character}
                </div>
              </div>

              {/* Player 2 (Opponent) */}
              <div
                className={`p-3 rounded-xl bg-slate-950 border text-left transition-all ${
                  opponent.connected ? 'border-emerald-500/40' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      opponent.connected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                    }`}
                  ></span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Player 2 {opponent.connected ? '(Ready)' : '(Waiting)'}
                  </span>
                </div>
                <div className="font-bold text-xs text-white truncate">
                  {opponent.connected
                    ? playerRole === 'client'
                      ? playerName
                      : opponent.name
                    : 'Searching rival...'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {opponent.connected ? 'Synchronized' : 'Pending connection'}
                </div>
              </div>
            </div>

            {/* Host Launch Match Button */}
            {playerRole === 'host' ? (
              <button
                onClick={triggerStartMatch}
                disabled={!opponent.connected}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 disabled:pointer-events-none font-black text-sm text-black shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                {opponent.connected ? '⚔️ START 3-ROUND MATCH' : 'Waiting for Player 2 to Connect...'}
              </button>
            ) : (
              <div className="text-xs text-amber-300 font-semibold py-2">
                Connected! Waiting for host to initiate Round 1...
              </div>
            )}

            {copyNotice && (
              <div className="mt-3 text-xs text-emerald-400 font-semibold">{copyNotice}</div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 3: GAME HUD & ACTIVE PLAYING ARENA                  */}
        {/* ========================================================= */}
        {(gamePhase === 'PLAYING' ||
          gamePhase === 'COUNTDOWN' ||
          gamePhase === 'ROUND_RECAP' ||
          gamePhase === 'MATCH_OVER') && (
          <div className="w-full flex flex-col items-center">
            {/* Top Match HUD */}
            <div className="w-full max-w-[800px] mb-3 grid grid-cols-3 items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-xl">
              {/* Player 1 Score & Wins */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-xl">
                  {getCharacterById(p1Ref.current.charId).icon}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-cyan-400 truncate max-w-[90px]">
                      {p1Ref.current.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                      P1
                    </span>
                  </div>
                  <div className="text-xl font-mono font-black text-white">{scores.p1} pts</div>
                  <div className="text-[10px] text-amber-400 font-bold">
                    {'⭐'.repeat(roundWins.p1)} {roundWins.p1} Wins
                  </div>
                </div>
              </div>

              {/* Center Round & Synchronized Timer */}
              <div className="text-center">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                  Round {currentRound} of {MAP_CONFIG.totalRounds}
                </div>
                <div
                  className={`text-3xl font-black font-mono tracking-wider ${
                    timeRemaining <= 5 ? 'text-rose-500 animate-pulse' : 'text-white'
                  }`}
                >
                  00:{timeRemaining.toString().padStart(2, '0')}
                </div>
                <div className="text-[9px] font-mono uppercase text-slate-500">
                  {gamePhase === 'PLAYING' ? '🟢 Live Duel' : '🟡 Intermission'}
                </div>
              </div>

              {/* Player 2 Score & Wins */}
              <div className="flex items-center justify-end gap-3 text-right">
                <div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                      P2
                    </span>
                    <span className="text-xs font-black text-rose-400 truncate max-w-[90px]">
                      {p2Ref.current.name}
                    </span>
                  </div>
                  <div className="text-xl font-mono font-black text-white">{scores.p2} pts</div>
                  <div className="text-[10px] text-amber-400 font-bold">
                    {'⭐'.repeat(roundWins.p2)} {roundWins.p2} Wins
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-xl">
                  {getCharacterById(p2Ref.current.charId).icon}
                </div>
              </div>
            </div>

            {/* Canvas Container with Overlays */}
            <div className="relative w-full max-w-[800px] aspect-[800/500] rounded-2xl overflow-hidden border border-cyan-500/40 shadow-2xl bg-black">
              <canvas
                ref={canvasRef}
                width={MAP_CONFIG.width}
                height={MAP_CONFIG.height}
                className="w-full h-full block"
              />

              {/* COUNTDOWN OVERLAY */}
              {gamePhase === 'COUNTDOWN' && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                  <div className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2">
                    Round {currentRound} Commencing
                  </div>
                  <div className="text-8xl font-black font-mono text-white animate-bounce">
                    {intermissionCount > 0 ? intermissionCount : 'GO!'}
                  </div>
                  <div className="text-xs text-slate-400 mt-3">
                    Use WASD / Arrows to collect energy orbs!
                  </div>
                </div>
              )}

              {/* ROUND RECAP OVERLAY */}
              {gamePhase === 'ROUND_RECAP' && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 text-center animate-fade-in">
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
                    Round {currentRound} Complete!
                  </div>
                  <h3 className="text-3xl font-black text-white mb-4">
                    {scores.p1 > scores.p2
                      ? `🏆 ${p1Ref.current.name} Takes Round ${currentRound}!`
                      : scores.p2 > scores.p1
                      ? `🏆 ${p2Ref.current.name} Takes Round ${currentRound}!`
                      : '🤝 Round Ended in a Draw!'}
                  </h3>

                  <div className="flex items-center gap-8 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 mb-4">
                    <div>
                      <div className="text-xs text-cyan-400 font-bold">{p1Ref.current.name}</div>
                      <div className="text-2xl font-mono font-black text-white">{scores.p1} pts</div>
                    </div>
                    <div className="text-lg font-black text-slate-600">VS</div>
                    <div>
                      <div className="text-xs text-rose-400 font-bold">{p2Ref.current.name}</div>
                      <div className="text-2xl font-mono font-black text-white">{scores.p2} pts</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 font-medium">
                    {currentRound < MAP_CONFIG.totalRounds
                      ? `Next Round ${currentRound + 1} starting in 3 seconds...`
                      : 'Tallying Final Match Champion...'}
                  </div>
                </div>
              )}

              {/* MATCH OVER / GRAND CHAMPION OVERLAY */}
              {gamePhase === 'MATCH_OVER' && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center z-30 p-6 text-center">
                  <div className="text-5xl mb-2 animate-bounce">🏆</div>
                  <div className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">
                    Match Finished (3 Rounds Completed)
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">
                    {matchWinner === 'p1'
                      ? `${p1Ref.current.name} IS THE CHAMPION!`
                      : matchWinner === 'p2'
                      ? `${p2Ref.current.name} IS THE CHAMPION!`
                      : 'HONORABLE DRAW!'}
                  </h2>

                  {/* 3-Round Scorecard Table */}
                  <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 text-xs">
                    <div className="grid grid-cols-4 font-bold text-slate-400 border-b border-slate-800 pb-2 mb-2">
                      <span>Round</span>
                      <span>{p1Ref.current.name}</span>
                      <span>{p2Ref.current.name}</span>
                      <span>Winner</span>
                    </div>
                    {roundsHistory.map((h) => (
                      <div key={h.round} className="grid grid-cols-4 py-1 border-b border-slate-800/40 text-slate-300">
                        <span className="font-bold">Round {h.round}</span>
                        <span className="font-mono text-cyan-400">{h.p1Score} pts</span>
                        <span className="font-mono text-rose-400">{h.p2Score} pts</span>
                        <span className="font-bold text-amber-400 uppercase">
                          {h.winner === 'p1' ? 'P1' : h.winner === 'p2' ? 'P2' : 'Tie'}
                        </span>
                      </div>
                    ))}
                    <div className="grid grid-cols-4 font-black pt-2 text-white">
                      <span>TOTAL</span>
                      <span className="text-cyan-400 font-mono">
                        {roundsHistory.reduce((s, h) => s + h.p1Score, 0)} pts
                      </span>
                      <span className="text-rose-400 font-mono">
                        {roundsHistory.reduce((s, h) => s + h.p2Score, 0)} pts
                      </span>
                      <span className="text-amber-300 font-mono">
                        {roundWins.p1} - {roundWins.p2}
                      </span>
                    </div>
                  </div>

                  {/* Rematch & Navigation Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (playerRole === 'host') {
                          triggerStartMatch();
                        } else {
                          networkRef.current?.send({ type: 'REMATCH_REQ' });
                        }
                      }}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-black text-xs text-black shadow-lg hover:brightness-110 transition-all"
                    >
                      🔄 Play Again (Rematch)
                    </button>
                    <button
                      onClick={() => setShowLeaderboard(true)}
                      className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white transition-all"
                    >
                      📊 Global Leaderboard
                    </button>
                    <button
                      onClick={() => setGamePhase('LOBBY')}
                      className="px-4 py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-xs text-slate-300 transition-all"
                    >
                      Lobby
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Touch Controls & Desktop Keyboard Hints */}
            <div className="w-full max-w-[800px] mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-400 hidden sm:block">
                🎮 Controls: <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">W</kbd>{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">A</kbd>{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">S</kbd>{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">D</kbd> or Arrows to Move |{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Space</kbd> for Turbo Dash
              </div>

              {/* On-screen touch d-pad for mobile / touch devices */}
              <div className="flex sm:hidden items-center justify-between w-full px-2">
                <div className="grid grid-cols-3 gap-1 w-32">
                  <div></div>
                  <button
                    onPointerDown={() => handleVirtualDir('up', true)}
                    onPointerUp={() => handleVirtualDir('up', false)}
                    className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold active:bg-cyan-500"
                  >
                    ▲
                  </button>
                  <div></div>
                  <button
                    onPointerDown={() => handleVirtualDir('left', true)}
                    onPointerUp={() => handleVirtualDir('left', false)}
                    className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold active:bg-cyan-500"
                  >
                    ◀
                  </button>
                  <button
                    onPointerDown={() => handleVirtualDir('down', true)}
                    onPointerUp={() => handleVirtualDir('down', false)}
                    className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold active:bg-cyan-500"
                  >
                    ▼
                  </button>
                  <button
                    onPointerDown={() => handleVirtualDir('right', true)}
                    onPointerUp={() => handleVirtualDir('right', false)}
                    className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold active:bg-cyan-500"
                  >
                    ▶
                  </button>
                </div>

                <button
                  onClick={triggerDash}
                  className="px-6 py-4 rounded-2xl bg-cyan-500 text-black font-black text-sm active:scale-95 shadow-lg"
                >
                  ⚡ DASH
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* GLOBAL LEADERBOARD MODAL                                   */}
      {/* ========================================================= */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/30 w-full max-w-2xl rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <h3 className="text-lg font-black text-white">Cyber Arena Leaderboard</h3>
                  <p className="text-[11px] text-slate-400">Match Champions & High Scores</p>
                </div>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Leaderboard Table */}
            <div className="flex-1 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3">Hero</th>
                    <th className="py-2.5 px-3 text-right">High Score</th>
                    <th className="py-2.5 px-3 text-right">Victories</th>
                    <th className="py-2.5 px-3 text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {leaderboardData.map((player, idx) => {
                    const charObj = getCharacterById(player.character);
                    return (
                      <tr key={player.id || idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold">
                          {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-white">{player.name}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
                            <span>{charObj.icon}</span>
                            <span>{charObj.name}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-cyan-400">
                          {player.highScore}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-400 font-bold">
                          {player.wins} / {player.matches}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400 font-bold">
                          {player.winRate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  const reset = resetLeaderboard();
                  setLeaderboardData(reset);
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors text-[11px]"
              >
                Reset Scores to Default
              </button>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
