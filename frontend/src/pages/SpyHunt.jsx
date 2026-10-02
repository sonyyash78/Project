import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DETECTIVE_CHARACTERS, getDetectiveById } from '../game/characters';
import { CASES, LOCATIONS, MAP_CONNECTIONS, getCaseByRound } from '../game/cases';
import { SpyHuntNetwork } from '../game/network';
import { DetectiveAudio } from '../game/sound';
import { getSpyLeaderboard, recordSpyMatchResults, resetSpyLeaderboard } from '../game/leaderboard';

export default function SpyHunt() {
  // Game phases:
  // 'HOME' | 'NAME_CHAR_SETUP' | 'LOBBY' | 'CASE_INTRO' | 'INVESTIGATION' | 'ROUND_RESULT' | 'FINAL_RESULTS'
  const [phase, setPhase] = useState('HOME');
  const [setupMode, setSetupMode] = useState('create'); // 'create' | 'join'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Local Player identity
  const [playerId] = useState(() => {
    return 'p_' + Math.random().toString(36).substring(2, 9);
  });
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('SPY_PLAYER_NAME') || '';
  });
  const [selectedCharId, setSelectedCharId] = useState('detective');

  // Room state
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]); // [{ id, name, character, isHost, score, casesSolved, currentAnswer, isLocked }]
  const [selectedLocation, setSelectedLocation] = useState('HOTEL');

  // Active Mystery Round State
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [localAnswer, setLocalAnswer] = useState(null); // Selected suspect name
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [roundScores, setRoundScores] = useState({}); // { [playerId]: points }
  const [lastRoundResult, setLastRoundResult] = useState(null); // { culprit, explanation, winners: [] }

  // Networking & Timers
  const networkRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const roundEndTimeRef = useRef(null);

  // Initialize and check URL parameters on mount
  useEffect(() => {
    setGlobalLeaderboard(getSpyLeaderboard());

    const searchStr = window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(searchStr);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCodeInput(roomParam.toUpperCase());
      setSetupMode('join');
      setPhase('NAME_CHAR_SETUP');
    }
  }, []);

  // Audio helper
  const playSfx = useCallback((type, ...args) => {
    if (!soundEnabled) return;
    if (type === 'clue') DetectiveAudio.clueInspect();
    if (type === 'tick') DetectiveAudio.timerTick(...args);
    if (type === 'lock') DetectiveAudio.lockAnswer();
    if (type === 'correct') DetectiveAudio.correctAnswer();
    if (type === 'wrong') DetectiveAudio.wrongAnswer();
    if (type === 'victory') DetectiveAudio.caseClosed();
  }, [soundEnabled]);

  const showToast = (msg, duration = 2500) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), duration);
  };

  // -------------------------------------------------------------------
  // MULTIPLAYER MESSAGE ROUTER
  // -------------------------------------------------------------------
  const handleNetworkMessage = useCallback((packet) => {
    if (!packet || typeof packet !== 'object') return;

    switch (packet.type) {
      // 1. GUEST REQUESTS TO JOIN
      case 'PLAYER_JOIN_REQUEST':
        if (isHost) {
          setPlayers((prev) => {
            if (prev.length >= 8) {
              networkRef.current?.broadcast({
                type: 'ROOM_ERROR',
                targetPlayerId: packet.playerId,
                message: 'Room is at maximum capacity (8 players).'
              });
              return prev;
            }

            const existingIndex = prev.findIndex((p) => p.id === packet.playerId);
            let updatedList;
            if (existingIndex >= 0) {
              updatedList = [...prev];
              updatedList[existingIndex] = {
                ...updatedList[existingIndex],
                name: packet.playerName,
                character: packet.character
              };
            } else {
              updatedList = [
                ...prev,
                {
                  id: packet.playerId,
                  name: packet.playerName,
                  character: packet.character,
                  isHost: false,
                  score: 0,
                  casesSolved: 0,
                  currentAnswer: null,
                  isLocked: false
                }
              ];
            }

            // Host broadcasts updated full room state to all players
            networkRef.current?.broadcast({
              type: 'SYNC_ROOM_STATE',
              players: updatedList,
              currentRound,
              phase
            });

            return updatedList;
          });
        }
        break;

      // 2. HOST SYNCHRONIZES ROOM STATE TO GUESTS
      case 'SYNC_ROOM_STATE':
        if (!isHost) {
          setPlayers(packet.players || []);
          if (packet.phase && packet.phase !== phase) {
            setPhase(packet.phase);
          }
        }
        break;

      // 3. PLAYER UPDATES CHARACTER OR NAME IN LOBBY
      case 'UPDATE_PROFILE':
        setPlayers((prev) => {
          const next = prev.map((p) => (p.id === packet.playerId ? { ...p, character: packet.character, name: packet.name } : p));
          if (isHost) {
            networkRef.current?.broadcast({
              type: 'SYNC_ROOM_STATE',
              players: next,
              currentRound,
              phase
            });
          }
          return next;
        });
        break;

      // 4. HOST STARTS CASE INVESTIGATION
      case 'CASE_START':
        setCurrentRound(packet.round);
        setTimeRemaining(30);
        setLocalAnswer(null);
        setIsAnswerLocked(false);
        setRoundScores({});
        setLastRoundResult(null);

        const targetCase = getCaseByRound(packet.round);
        setSelectedLocation(targetCase.location);

        // Show brief case intro overlay
        setPhase('CASE_INTRO');
        playSfx('clue');

        setTimeout(() => {
          setPhase('INVESTIGATION');
        }, 3000);
        break;

      // 5. CLOCK TICK FROM HOST
      case 'TIMER_TICK':
        setTimeRemaining(packet.timeRemaining);
        if (packet.timeRemaining <= 5 && packet.timeRemaining > 0) {
          playSfx('tick', true);
        } else if (packet.timeRemaining % 5 === 0) {
          playSfx('tick', false);
        }
        break;

      // 6. PLAYER SUBMITS ANSWER
      case 'SUBMIT_ANSWER':
        setPlayers((prev) => {
          const next = prev.map((p) =>
            p.id === packet.playerId ? { ...p, currentAnswer: packet.answer, isLocked: true } : p
          );

          // If Host, verify if all active players have submitted
          if (isHost) {
            const allLocked = next.every((p) => p.isLocked);
            if (allLocked) {
              handleHostEvaluateRound(next, currentRound, packet.remainingTime || 1);
            } else {
              networkRef.current?.broadcast({
                type: 'SYNC_LOCKED_STATUS',
                players: next.map((p) => ({ id: p.id, isLocked: p.isLocked }))
              });
            }
          }

          return next;
        });
        break;

      // 7. SYNC LOCKED STATUS ONLY (keeps answers secret until reveal)
      case 'SYNC_LOCKED_STATUS':
        if (!isHost && packet.players) {
          setPlayers((prev) =>
            prev.map((p) => {
              const item = packet.players.find((x) => x.id === p.id);
              return item ? { ...p, isLocked: item.isLocked } : p;
            })
          );
        }
        break;

      // 8. ROUND EVALUATED AND RESOLVED
      case 'ROUND_RESOLVED':
        handleApplyRoundResult(packet.resultData);
        break;

      // 9. FINAL GAME OVER & LEADERBOARD
      case 'MATCH_CONCLUDED':
        setPlayers(packet.finalPlayers || []);
        setPhase('FINAL_RESULTS');
        playSfx('victory');
        break;

      // 10. REMATCH / PLAY AGAIN
      case 'RESTART_GAME':
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            score: 0,
            casesSolved: 0,
            currentAnswer: null,
            isLocked: false
          }))
        );
        setCurrentRound(1);
        setLocalAnswer(null);
        setIsAnswerLocked(false);
        setPhase('LOBBY');
        showToast('Host initiated a new investigation!');
        break;

      // 11. HOST DISCONNECTED -> HOST MIGRATION
      case 'HOST_LEFT':
        handleHostMigration();
        break;

      case 'PEER_DISCONNECTED':
        showToast('A detective lost connection.');
        break;

      case 'ROOM_ERROR':
        if (packet.targetPlayerId === playerId) {
          setErrorMessage(packet.message);
          setPhase('HOME');
        }
        break;

      default:
        break;
    }
  }, [isHost, phase, currentRound, playerId, playSfx]);

  // Host migration logic to avoid crashing if host leaves
  const handleHostMigration = () => {
    setPlayers((prev) => {
      const remaining = prev.filter((p) => p.id !== 'host');
      if (remaining.length === 0) return [];
      
      const newHost = remaining[0];
      const nextList = remaining.map((p, idx) => ({ ...p, isHost: idx === 0 }));

      if (newHost.id === playerId) {
        setIsHost(true);
        showToast('You are now the lead detective (Host)!');
      } else {
        showToast(`${newHost.name} is now the host.`);
      }

      return nextList;
    });
  };

  // -------------------------------------------------------------------
  // ROOM CREATION & JOINING FLOW
  // -------------------------------------------------------------------
  const handleStartCreateRoom = () => {
    setSetupMode('create');
    setErrorMessage('');
    setPhase('NAME_CHAR_SETUP');
  };

  const handleStartJoinRoom = () => {
    setSetupMode('join');
    setErrorMessage('');
    setPhase('NAME_CHAR_SETUP');
  };

  const handleConfirmProfileAndEnter = () => {
    const trimmedName = (playerName || '').trim();
    if (!trimmedName) {
      setErrorMessage('Please enter your detective name.');
      return;
    }

    localStorage.setItem('SPY_PLAYER_NAME', trimmedName);

    if (setupMode === 'create') {
      // Generate clean 5-character room code (e.g. SH7K9)
      const code = 'SH' + Math.floor(100 + Math.random() * 900);
      setActiveRoomCode(code);
      setIsHost(true);

      const hostPlayer = {
        id: playerId,
        name: trimmedName,
        character: selectedCharId,
        isHost: true,
        score: 0,
        casesSolved: 0,
        currentAnswer: null,
        isLocked: false
      };
      setPlayers([hostPlayer]);

      initNetwork(code, true, hostPlayer);
      setPhase('LOBBY');
    } else {
      const trimmedCode = (roomCodeInput || '').trim().toUpperCase();
      if (!trimmedCode) {
        setErrorMessage('Please enter a valid Room Code.');
        return;
      }

      setActiveRoomCode(trimmedCode);
      setIsHost(false);

      const guestPlayer = {
        id: playerId,
        name: trimmedName,
        character: selectedCharId,
        isHost: false,
        score: 0,
        casesSolved: 0,
        currentAnswer: null,
        isLocked: false
      };
      setPlayers([guestPlayer]);

      initNetwork(trimmedCode, false, guestPlayer);
      setPhase('LOBBY');
    }
  };

  const initNetwork = (code, hostFlag, profile) => {
    if (networkRef.current) {
      networkRef.current.destroy();
    }

    networkRef.current = new SpyHuntNetwork({
      roomId: code,
      playerId,
      playerName: profile.name,
      character: profile.character,
      isHost: hostFlag,
      onMessage: handleNetworkMessage,
      onStatusChange: ({ status }) => {
        if (status === 'CONNECTED_TO_HOST') {
          showToast('Connected to room!');
        }
      }
    });
  };

  // Copy shareable link / code
  const copyRoomCode = () => {
    navigator.clipboard.writeText(activeRoomCode);
    showToast('Room Code Copied: ' + activeRoomCode);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}${window.location.pathname}#/?room=${activeRoomCode}`;
    navigator.clipboard.writeText(link);
    showToast('Shareable Link Copied to Clipboard!');
  };

  const openSecondTab = () => {
    const link = `${window.location.origin}${window.location.pathname}#/?room=${activeRoomCode}`;
    window.open(link, '_blank');
  };

  // -------------------------------------------------------------------
  // INVESTIGATION & GAMEPLAY LOGIC
  // -------------------------------------------------------------------
  const handleHostStartGame = () => {
    if (players.length < 2) {
      setErrorMessage('Minimum 2 players required to begin the investigation.');
      return;
    }
    setErrorMessage('');
    startRoundOnHost(1);
  };

  const startRoundOnHost = (roundNum) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    // Reset round states
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        currentAnswer: null,
        isLocked: false
      }))
    );

    networkRef.current?.broadcast({
      type: 'CASE_START',
      round: roundNum
    });

    setCurrentRound(roundNum);
    setTimeRemaining(30);
    setLocalAnswer(null);
    setIsAnswerLocked(false);
    setRoundScores({});
    setLastRoundResult(null);

    const targetCase = getCaseByRound(roundNum);
    setSelectedLocation(targetCase.location);

    setPhase('CASE_INTRO');
    playSfx('clue');

    setTimeout(() => {
      setPhase('INVESTIGATION');
      startHostRoundTimer(roundNum);
    }, 3000);
  };

  const startHostRoundTimer = (roundNum) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    let seconds = 30;
    timerIntervalRef.current = setInterval(() => {
      seconds -= 1;
      setTimeRemaining(seconds);

      networkRef.current?.broadcast({
        type: 'TIMER_TICK',
        timeRemaining: seconds
      });

      if (seconds <= 5 && seconds > 0) {
        playSfx('tick', true);
      } else if (seconds % 5 === 0) {
        playSfx('tick', false);
      }

      if (seconds <= 0) {
        clearInterval(timerIntervalRef.current);
        // Time expired: auto-lock and evaluate
        setPlayers((latestPlayers) => {
          handleHostEvaluateRound(latestPlayers, roundNum, 0);
          return latestPlayers;
        });
      }
    }, 1000);
  };

  // Suspect selection
  const handleSelectSuspect = (suspectName) => {
    if (isAnswerLocked || phase !== 'INVESTIGATION') return;

    setLocalAnswer(suspectName);
    setIsAnswerLocked(true);
    playSfx('lock');

    // Notify host of submission
    networkRef.current?.broadcast({
      type: 'SUBMIT_ANSWER',
      playerId,
      answer: suspectName,
      remainingTime: timeRemaining
    });

    // Update local player state
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, currentAnswer: suspectName, isLocked: true } : p))
    );
  };

  // Host authoritative evaluation
  const handleHostEvaluateRound = (playerList, roundNum, timeBonusRemaining) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const activeCase = getCaseByRound(roundNum);
    const correctCulprit = activeCase.culprit;

    const roundScoreMap = {};
    const updatedPlayers = playerList.map((p) => {
      const isCorrect = p.currentAnswer === correctCulprit;
      // 100 pts + time bonus (up to 60 pts based on speed)
      const pointsEarned = isCorrect ? 100 + Math.max(0, Math.floor((timeBonusRemaining || 0) * 2)) : 0;
      roundScoreMap[p.id] = pointsEarned;

      return {
        ...p,
        score: p.score + pointsEarned,
        casesSolved: p.casesSolved + (isCorrect ? 1 : 0),
        isLocked: true
      };
    });

    const resultData = {
      round: roundNum,
      culprit: correctCulprit,
      explanation: activeCase.deductionNote,
      roundScores: roundScoreMap,
      updatedPlayers
    };

    networkRef.current?.broadcast({
      type: 'ROUND_RESOLVED',
      resultData
    });

    handleApplyRoundResult(resultData);
  };

  // Apply result on all clients
  const handleApplyRoundResult = (resultData) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    setPlayers(resultData.updatedPlayers);
    setRoundScores(resultData.roundScores);
    setLastRoundResult({
      culprit: resultData.culprit,
      explanation: resultData.explanation
    });

    setPhase('ROUND_RESULT');

    const myPoints = resultData.roundScores[playerId] || 0;
    if (myPoints > 0) {
      playSfx('correct');
    } else {
      playSfx('wrong');
    }

    // Auto-advance or conclude
    if (resultData.round < 3) {
      setTimeout(() => {
        if (isHost) {
          startRoundOnHost(resultData.round + 1);
        }
      }, 6500);
    } else {
      // Round 3 completed: conclude match after viewing results
      setTimeout(() => {
        if (isHost) {
          networkRef.current?.broadcast({
            type: 'MATCH_CONCLUDED',
            finalPlayers: resultData.updatedPlayers
          });
        }
        setPhase('FINAL_RESULTS');
        playSfx('victory');

        // Persist to all-time leaderboard
        const saved = recordSpyMatchResults(
          resultData.updatedPlayers.map((p) => ({
            name: p.name,
            character: p.character,
            points: p.score,
            casesSolved: p.casesSolved
          }))
        );
        setGlobalLeaderboard(saved);
      }, 6500);
    }
  };

  // Play Again trigger
  const handlePlayAgain = () => {
    if (isHost) {
      networkRef.current?.broadcast({
        type: 'RESTART_GAME'
      });
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          score: 0,
          casesSolved: 0,
          currentAnswer: null,
          isLocked: false
        }))
      );
      setCurrentRound(1);
      setLocalAnswer(null);
      setIsAnswerLocked(false);
      setPhase('LOBBY');
    } else {
      showToast('Waiting for the host to restart...');
    }
  };

  // -------------------------------------------------------------------
  // RENDER HELPERS
  // -------------------------------------------------------------------
  const currentCase = getCaseByRound(currentRound);
  const myPlayer = players.find((p) => p.id === playerId) || {
    name: playerName,
    character: selectedCharId,
    score: 0
  };
  const myRoundPoints = roundScores[playerId] ?? (localAnswer === currentCase.culprit ? 100 : 0);

  return (
    <div className="relative min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Persistent Top Navigation Bar */}
      <header className="border-b border-amber-500/20 bg-slate-950/80 backdrop-blur-xl px-4 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              if (phase === 'HOME') return;
              if (window.confirm('Return to home screen?')) {
                networkRef.current?.destroy();
                setPhase('HOME');
              }
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              🕵️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-widest bg-gradient-to-r from-amber-300 via-amber-100 to-yellow-500 bg-clip-text text-transparent">
                  SPY HUNT
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono font-bold uppercase tracking-wider">
                  2–8P
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-serif italic tracking-wide">
                "Find the culprit before time runs out."
              </p>
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-3">
            {activeRoomCode && (
              <button
                onClick={copyRoomCode}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 font-mono text-xs font-bold hover:bg-amber-500/20 transition-all"
                title="Copy Room Code"
              >
                <span>🔑 ROOM:</span>
                <span className="text-white underline">{activeRoomCode}</span>
              </button>
            )}

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900/80 text-xs hover:border-slate-500 transition-colors"
            >
              {soundEnabled ? '🔊 SFX' : '🔇 Mute'}
            </button>

            <button
              onClick={() => setShowLeaderboardModal(true)}
              className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold text-xs hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
            >
              🏆 Archives
            </button>
          </div>
        </div>
      </header>

      {/* Global Toast / Notification Bar */}
      {notice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black font-extrabold text-xs px-5 py-2 rounded-full shadow-2xl animate-bounce">
          {notice}
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col justify-center items-center z-10">
        {/* ================================================================= */}
        {/* VIEW 1: HOME SCREEN                                               */}
        {/* ================================================================= */}
        {phase === 'HOME' && (
          <div className="w-full max-w-xl bg-slate-950/80 border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-2xl text-center my-auto">
            {/* Detective Logo Stamp */}
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-4xl mb-5 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
              🔍
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-white mb-2 font-serif">
              SPY HUNT
            </h1>
            <p className="text-amber-400 font-serif italic text-base sm:text-lg mb-1">
              "Find the culprit before time runs out."
            </p>
            <p className="text-xs text-slate-400 tracking-wider font-mono mb-8 uppercase">
              2–8 players • 3 mysteries • Real-time multiplayer
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3.5 max-w-sm mx-auto mb-8">
              <button
                onClick={handleStartCreateRoom}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>🕵️</span> CREATE ROOM
              </button>

              <button
                onClick={handleStartJoinRoom}
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-sm uppercase tracking-wider hover:bg-slate-800/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>🔑</span> JOIN ROOM
              </button>
            </div>

            {/* Mystery Features Summary */}
            <div className="grid grid-cols-3 gap-2.5 pt-6 border-t border-slate-800/80 text-[11px] text-slate-400">
              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-base mb-1">🏛</div>
                <div className="font-bold text-slate-300">5 Locations</div>
                <div className="text-[10px] text-slate-500">Interactive Map</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-base mb-1">⏱</div>
                <div className="font-bold text-slate-300">30s Clocks</div>
                <div className="text-[10px] text-slate-500">Live Sync Timer</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-base mb-1">⚖️</div>
                <div className="font-bold text-slate-300">3 Mysteries</div>
                <div className="text-[10px] text-slate-500">Deduction Cases</div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: NAME & DETECTIVE CHARACTER SELECTION                      */}
        {/* ================================================================= */}
        {phase === 'NAME_CHAR_SETUP' && (
          <div className="w-full max-w-4xl bg-slate-950/85 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl my-auto">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                  <span>💼</span> {setupMode === 'create' ? 'Host Case File' : 'Join Investigation'}
                </h2>
                <p className="text-xs text-slate-400">
                  {setupMode === 'create'
                    ? 'Enter your identity and choose your detective specialization.'
                    : 'Enter the room code and your detective identity.'}
                </p>
              </div>
              <button
                onClick={() => setPhase('HOME')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Left Column: Player Inputs */}
              <div className="flex flex-col gap-4">
                {setupMode === 'join' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                      Room Access Code
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. SH7K9"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base font-mono font-bold text-white uppercase focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                    Your Detective Name
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Yash, Rahul, Priya"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    No login or signup required. Displayed to all players in the room.
                  </span>
                </div>

                {/* Selected Character Preview Card */}
                {(() => {
                  const activeChar = getDetectiveById(selectedCharId);
                  return (
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-amber-500/30 flex items-center gap-4 mt-auto">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-3xl">
                        {activeChar.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-amber-300">
                            {activeChar.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {activeChar.badge}
                          </span>
                        </div>
                        <p className="text-xs text-white font-medium">{activeChar.title}</p>
                        <p className="text-[11px] text-slate-400 italic">"{activeChar.description}"</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Character Selection (5 Detectives) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                  Select Detective Character (Cosmetic)
                </label>
                <div className="space-y-2.5">
                  {DETECTIVE_CHARACTERS.map((char) => {
                    const isSelected = char.id === selectedCharId;
                    return (
                      <div
                        key={char.id}
                        onClick={() => setSelectedCharId(char.id)}
                        className={`cursor-pointer rounded-2xl p-3 border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{char.avatar}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-white">{char.name}</span>
                              <span className="text-[10px] text-amber-400/80 font-mono">• {char.codeName}</span>
                            </div>
                            <p className="text-[11px] text-slate-400">{char.description}</p>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400 text-black">
                            Selected
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Confirm Enter Button */}
            <button
              onClick={handleConfirmProfileAndEnter}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-black text-sm uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {setupMode === 'create' ? 'CREATE ROOM & ENTER LOBBY' : 'JOIN ROOM'}
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 3: MULTIPLAYER LOBBY (2–8 Players)                           */}
        {/* ================================================================= */}
        {phase === 'LOBBY' && (
          <div className="w-full max-w-3xl bg-slate-950/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl my-auto">
            {/* Header with Room Code */}
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold uppercase text-amber-400 tracking-widest block mb-1">
                Investigation Room Code
              </span>
              <div className="inline-flex items-center gap-3 bg-slate-900 border border-amber-500/40 rounded-2xl px-6 py-2.5 mb-2 shadow-inner">
                <span className="text-3xl font-black font-mono tracking-widest text-amber-300 select-all">
                  {activeRoomCode}
                </span>
                <button
                  onClick={copyRoomCode}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                  title="Copy Code"
                >
                  📋
                </button>
              </div>
              <p className="text-xs text-slate-400">Share this code with your friends (2–8 players).</p>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <button
                onClick={copyRoomLink}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-xs font-bold text-white transition-all flex items-center gap-1.5"
              >
                🔗 Copy Invite Link
              </button>
              <button
                onClick={openSecondTab}
                className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                👥 Open 2nd Detective Tab
              </button>
            </div>

            {/* Player Roster Grid (2–8 Players) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>🕵️</span> Active Detectives ({players.length}/8)
                </h3>
                <span className="text-[11px] text-amber-400 font-mono">
                  {players.length < 2 ? '⚠️ Need at least 2 players' : '✅ Ready to investigate'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {players.map((p, idx) => {
                  const charInfo = getDetectiveById(p.character);
                  const isCurrent = p.id === playerId;
                  return (
                    <div
                      key={p.id || idx}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-950/20'
                          : 'border-slate-800 bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                          {charInfo.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-white">{p.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-black font-bold uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {charInfo.name} — <span className="italic">{charInfo.title}</span>
                          </p>
                        </div>
                      </div>

                      {p.isHost && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/50 bg-amber-500/10 text-amber-300 font-black uppercase tracking-wider">
                          HOST
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Host Action or Guest Waiting Status */}
            {isHost ? (
              <div>
                <button
                  onClick={handleHostStartGame}
                  disabled={players.length < 2}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-sm uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  {players.length < 2
                    ? 'WAITING FOR AT LEAST 2 PLAYERS...'
                    : 'START INVESTIGATION'}
                </button>
                {players.length < 2 && (
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Share the room code or click "Open 2nd Detective Tab" to test 2-player multiplayer.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <div className="text-amber-400 font-bold text-sm mb-1 animate-pulse">
                  WAITING FOR HOST TO START INVESTIGATION...
                </div>
                <p className="text-xs text-slate-400">
                  Reviewing case briefing files with fellow detectives.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 4: CASE BRIEFING / INTRO OVERLAY                             */}
        {/* ================================================================= */}
        {phase === 'CASE_INTRO' && (
          <div className="w-full max-w-2xl bg-slate-950/95 border-2 border-amber-500/50 rounded-3xl p-8 shadow-2xl text-center my-auto animate-fade-in">
            <div className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-2">
              CONFIDENTIAL CASE DOSSIER • ROUND {currentCase.round} OF 3
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-wide mb-3">
              {currentCase.title}
            </h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-6">
              <span>{currentCase.locationIcon}</span>
              <span>CRIME SCENE: {currentCase.location}</span>
            </div>
            <p className="text-sm sm:text-base text-slate-300 italic max-w-xl mx-auto mb-8 font-serif leading-relaxed">
              "{currentCase.story}"
            </p>
            <div className="text-xs font-mono text-amber-400 animate-pulse font-bold uppercase tracking-wider">
              ⏱ Opening Crime Scene Clues & Suspect Dossiers...
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 5: ACTIVE INVESTIGATION (MAP, CLUES, SUSPECTS, TIMER)        */}
        {/* ================================================================= */}
        {phase === 'INVESTIGATION' && (
          <div className="w-full max-w-5xl flex flex-col gap-5 my-auto">
            {/* Top Investigation HUD */}
            <div className="w-full bg-slate-950/85 border border-amber-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
              {/* Case Title & Story Header */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-amber-400">
                    ROUND {currentCase.round}/3:
                  </span>
                  <h2 className="text-base font-black text-white tracking-wide font-serif">
                    {currentCase.title}
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 italic max-w-md">
                  "{currentCase.story}"
                </p>
              </div>

              {/* Synchronized 30-Second Countdown Timer */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[9px] font-mono font-bold uppercase text-slate-400">
                    Investigation Timer
                  </div>
                  <div
                    className={`text-2xl sm:text-3xl font-black font-mono tracking-wider ${
                      timeRemaining <= 5 ? 'text-rose-500 animate-pulse' : 'text-amber-300'
                    }`}
                  >
                    00:{timeRemaining.toString().padStart(2, '0')}
                  </div>
                </div>

                {isAnswerLocked ? (
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔒</span> ANSWER LOCKED
                  </div>
                ) : (
                  <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-xs uppercase tracking-wider animate-pulse">
                    ACCUSE SUSPECT
                  </div>
                )}
              </div>
            </div>

            {/* Investigation Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left / Center Column: Connected Investigation Map (5 Locations) */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <span>🗺️</span> Investigation City Map
                    </h3>
                    <span className="text-[10px] text-slate-400">Click location to inspect</span>
                  </div>

                  {/* Visual 2D Connected Map */}
                  <div className="relative w-full aspect-[4/3] bg-slate-900/90 rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-between overflow-hidden">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px]"></div>

                    {/* SVG Connector Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      {MAP_CONNECTIONS.map((conn, idx) => {
                        const fromLoc = LOCATIONS.find((l) => l.id === conn.from);
                        const toLoc = LOCATIONS.find((l) => l.id === conn.to);
                        return (
                          <line
                            key={idx}
                            x1={`${fromLoc.x}%`}
                            y1={`${fromLoc.y}%`}
                            x2={`${toLoc.x}%`}
                            y2={`${toLoc.y}%`}
                            stroke="#d97706"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                            opacity="0.4"
                          />
                        );
                      })}
                    </svg>

                    {/* Interactive Map Location Nodes */}
                    {LOCATIONS.map((loc) => {
                      const isSelected = selectedLocation === loc.id;
                      const hasCaseClue = currentCase.clues.some((c) => c.location === loc.id);
                      return (
                        <div
                          key={loc.id}
                          onClick={() => {
                            setSelectedLocation(loc.id);
                            playSfx('clue');
                          }}
                          style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer p-2.5 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                            isSelected
                              ? 'border-amber-400 bg-amber-950/60 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-110 z-20'
                              : 'border-slate-800 bg-slate-950/80 hover:border-slate-600 z-10'
                          }`}
                        >
                          <span className="text-xl sm:text-2xl">{loc.icon}</span>
                          <span className="text-[10px] font-black tracking-wider text-white">
                            {loc.name}
                          </span>
                          {hasCaseClue && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Location Details Card */}
                  {(() => {
                    const activeLoc = LOCATIONS.find((l) => l.id === selectedLocation) || LOCATIONS[0];
                    const locClues = currentCase.clues.filter((c) => c.location === activeLoc.id);
                    return (
                      <div className="mt-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{activeLoc.icon}</span>
                          <span className="text-xs font-bold text-white uppercase">{activeLoc.name}</span>
                          <span className="text-[10px] text-slate-400">— {activeLoc.subtitle}</span>
                        </div>
                        {locClues.length > 0 ? (
                          <div className="text-xs text-amber-300 font-medium">
                            🔍 Evidence Lead Found: "{locClues[0].text}"
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic">
                            No direct physical traces at this location. Cross-reference other leads.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Column: Case Clues & Suspects */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                {/* 4 Clues Dossier */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <span>📑</span> Collected Case Clues (4 Pieces of Evidence)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentCase.clues.map((clue) => (
                      <div
                        key={clue.id}
                        className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-amber-400">
                            EVIDENCE #{clue.num}
                          </span>
                          <span className="text-xs">{clue.icon}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug font-serif mb-2">
                          "{clue.text}"
                        </p>
                        <span className="text-[9px] text-slate-500 font-mono">
                          Lead Location: {clue.location}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 Suspects Card Grid */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <span>⚖️</span> Select the Culprit
                    </h3>
                    {isAnswerLocked && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        ✓ ACCUSATION SUBMITTED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 flex-1">
                    {currentCase.suspects.map((suspect) => {
                      const isChosen = localAnswer === suspect.name;
                      return (
                        <div
                          key={suspect.id}
                          onClick={() => handleSelectSuspect(suspect.name)}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                            isChosen
                              ? 'border-emerald-400 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                              : isAnswerLocked
                              ? 'border-slate-800 bg-slate-900/40 opacity-60 cursor-not-allowed'
                              : 'border-slate-800 bg-slate-900/80 hover:border-amber-400 hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{suspect.avatar}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-white">
                                  {suspect.name}
                                </span>
                                <span className="text-[10px] text-amber-300 font-mono">
                                  [{suspect.role}]
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 italic">
                                {suspect.description}
                              </p>
                            </div>
                          </div>

                          {isChosen ? (
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-emerald-500 text-black">
                              ACCUSED
                            </span>
                          ) : (
                            !isAnswerLocked && (
                              <button className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-bold uppercase hover:bg-amber-500 hover:text-black transition-colors">
                                Accuse
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 6: ROUND RESULT (Case Solved, Result, Live Leaderboard)      */}
        {/* ================================================================= */}
        {phase === 'ROUND_RESULT' && (
          <div className="w-full max-w-2xl bg-slate-950/95 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-center my-auto animate-fade-in">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 block mb-1">
              ROUND {currentRound} CONCLUDED
            </span>
            <h2 className="text-3xl font-black text-white font-serif mb-2">CASE SOLVED</h2>

            {/* Culprit Reveal Banner */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 mb-6">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block mb-1">
                TRUE CULPRIT:
              </span>
              <div className="text-2xl font-black text-white mb-2">
                {lastRoundResult?.culprit}
              </div>
              <p className="text-xs text-slate-300 italic font-serif max-w-lg mx-auto">
                "{lastRoundResult?.explanation}"
              </p>
            </div>

            {/* Local Player Outcome */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-6 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  Your Deduction:
                </span>
                <span className="text-sm font-bold text-white">
                  {localAnswer || 'No Accusation Made'}
                </span>
              </div>
              <div className="text-right">
                {myRoundPoints > 0 ? (
                  <span className="text-sm font-black text-emerald-400">
                    ✓ Correct (+{myRoundPoints} pts)
                  </span>
                ) : (
                  <span className="text-sm font-black text-rose-400">
                    ✕ Incorrect (+0 pts)
                  </span>
                )}
              </div>
            </div>

            {/* Live Leaderboard for Current Match */}
            <div className="mb-6 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Live Standings
              </h3>
              <div className="space-y-2">
                {players
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx) => {
                    const charObj = getDetectiveById(p.character);
                    return (
                      <div
                        key={p.id || idx}
                        className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 font-bold">#{idx + 1}</span>
                          <span>{charObj.avatar}</span>
                          <span className="font-bold text-white">{p.name}</span>
                        </div>
                        <div className="font-mono font-bold text-amber-300">
                          {p.score} pts
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="text-xs text-slate-400 italic">
              {currentRound < 3
                ? `Advancing to Mystery Round ${currentRound + 1} in a few seconds...`
                : 'Compiling Final Case Dossier & Champions...'}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 7: FINAL LEADERBOARD & CASE CLOSED                           */}
        {/* ================================================================= */}
        {phase === 'FINAL_RESULTS' && (
          <div className="w-full max-w-2xl bg-slate-950/95 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-center my-auto animate-fade-in">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-1">
              ALL 3 MYSTERIES SOLVED
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-serif text-white mb-2">
              CASE CLOSED
            </h2>
            <p className="text-xs text-slate-400 mb-6 font-serif italic">
              Final detective rankings and match points:
            </p>

            {/* Final Standings Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6 text-left">
              <div className="grid grid-cols-12 py-2.5 px-4 bg-slate-950 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 font-bold">
                <span className="col-span-2">Rank</span>
                <span className="col-span-5">Detective</span>
                <span className="col-span-2 text-right">Solved</span>
                <span className="col-span-3 text-right">Total Score</span>
              </div>
              <div className="divide-y divide-slate-800/40">
                {players
                  .slice()
                  .sort((a, b) => b.score - a.score || b.casesSolved - a.casesSolved)
                  .map((p, idx) => {
                    const charObj = getDetectiveById(p.character);
                    return (
                      <div
                        key={p.id || idx}
                        className={`grid grid-cols-12 py-3 px-4 text-xs items-center ${
                          idx === 0 ? 'bg-amber-500/10 font-black' : ''
                        }`}
                      >
                        <span className="col-span-2 font-mono text-amber-400 font-bold">
                          {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                        </span>
                        <div className="col-span-5 flex items-center gap-2">
                          <span>{charObj.avatar}</span>
                          <span className="font-extrabold text-white truncate">{p.name}</span>
                        </div>
                        <span className="col-span-2 text-right font-mono text-slate-300">
                          {p.casesSolved}/3
                        </span>
                        <span className="col-span-3 text-right font-mono font-bold text-amber-300">
                          {p.score} pts
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Play Again & Return Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handlePlayAgain}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
              >
                🔄 PLAY AGAIN
              </button>
              <button
                onClick={() => {
                  networkRef.current?.destroy();
                  setPhase('HOME');
                }}
                className="py-3 px-6 rounded-2xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                RETURN TO LOBBY
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ================================================================= */}
      {/* GLOBAL ARCHIVES / LEADERBOARD MODAL                               */}
      {/* ================================================================= */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-950 border border-amber-500/30 w-full max-w-xl rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏆</span>
                <div>
                  <h3 className="text-lg font-black text-white font-serif">Hall of Master Detectives</h3>
                  <p className="text-[10px] text-slate-400 font-mono">ALL-TIME ARCHIVED MYSTERIES</p>
                </div>
              </div>
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Detective</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-right">Solved</th>
                    <th className="py-2.5 px-3 text-right">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {globalLeaderboard.map((det, idx) => {
                    const charObj = getDetectiveById(det.character);
                    return (
                      <tr key={det.id || idx} className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-white">{det.name}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 text-[10px] text-slate-300 border border-slate-800">
                            <span>{charObj.avatar}</span>
                            <span>{charObj.name}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {det.casesSolved}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-300">
                          {det.points} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  const reset = resetSpyLeaderboard();
                  setGlobalLeaderboard(reset);
                }}
                className="text-slate-500 hover:text-slate-400 text-[11px]"
              >
                Reset Archives
              </button>
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors"
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
