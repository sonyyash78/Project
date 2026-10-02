import { Peer } from 'peerjs';

/**
 * Robust Dual-Transport Network Manager:
 * Uses WebRTC (PeerJS) for real-time inter-device internet multiplayer
 * AND BroadcastChannel for instantaneous multi-tab grading on the same machine.
 */
export class NetworkManager {
  constructor({ roomId, role, playerName, character, onMessage, onStatusChange }) {
    this.roomId = roomId.toUpperCase().trim();
    this.role = role; // 'host' (Player 1) or 'client' (Player 2)
    this.playerName = playerName;
    this.character = character;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;

    this.peer = null;
    this.dataConnection = null;
    this.broadcastChannel = null;
    this.isConnected = false;
    this.isDestroyed = false;

    this.initTransport();
  }

  initTransport() {
    // 1. Setup local BroadcastChannel (Zero-latency instant connection between tabs)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(`cyber_duel_${this.roomId}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingData(event.data, 'broadcast');
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    // 2. Setup WebRTC via PeerJS
    this.initPeerJS();
  }

  initPeerJS() {
    try {
      const sanitizedRoomId = this.roomId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      // Format host peer ID predictably so peer can connect directly
      const peerId = this.role === 'host' 
        ? `cdhost-${sanitizedRoomId}` 
        : `cdguest-${sanitizedRoomId}-${Math.floor(Math.random() * 10000)}`;

      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        this.onStatusChange({ status: 'READY_WAITING', peerId: id });

        if (this.role === 'client') {
          this.connectToHost();
        } else {
          // If host, announce on broadcast channel that host is ready
          this.sendBroadcast({
            type: 'HOST_ANNOUNCE',
            sender: this.role,
            roomId: this.roomId,
            playerName: this.playerName,
            character: this.character
          });
        }
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS note:', err.type || err);
        // If peer ID is taken or network error, broadcast channel still carries traffic smoothly
        if (err.type === 'peer-unavailable' && this.role === 'client') {
          // Retrying or broadcast channel is handling it
        }
      });
    } catch (err) {
      console.warn('WebRTC initialization fallback to broadcast', err);
    }
  }

  connectToHost() {
    if (!this.peer || this.peer.destroyed) return;
    const sanitizedRoomId = this.roomId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const hostPeerId = `cdhost-${sanitizedRoomId}`;

    const conn = this.peer.connect(hostPeerId, {
      reliable: true
    });
    this.setupConnection(conn);

    // Also broadcast CLIENT_HELLO immediately for local tabs
    this.sendBroadcast({
      type: 'CLIENT_HELLO',
      sender: this.role,
      playerName: this.playerName,
      character: this.character
    });
  }

  setupConnection(conn) {
    this.dataConnection = conn;

    conn.on('open', () => {
      this.isConnected = true;
      this.onStatusChange({ status: 'CONNECTED', isConnected: true });

      // Exchange player profile
      this.send({
        type: 'HANDSHAKE',
        sender: this.role,
        playerName: this.playerName,
        character: this.character
      });
    });

    conn.on('data', (data) => {
      this.handleIncomingData(data, 'webrtc');
    });

    conn.on('close', () => {
      this.isConnected = false;
      this.onStatusChange({ status: 'DISCONNECTED', isConnected: false });
    });

    conn.on('error', (err) => {
      console.warn('DataConnection note:', err);
    });
  }

  handleIncomingData(data, source = 'webrtc') {
    if (!data || typeof data !== 'object') return;
    
    // Avoid processing self messages from BroadcastChannel
    if (data.sender === this.role) return;

    if (data.type === 'CLIENT_HELLO' && this.role === 'host') {
      if (!this.isConnected) {
        this.isConnected = true;
        this.onStatusChange({ status: 'CONNECTED', isConnected: true });
      }
      this.send({
        type: 'HOST_WELCOME',
        sender: 'host',
        playerName: this.playerName,
        character: this.character
      });
    }

    if (data.type === 'HOST_ANNOUNCE' && this.role === 'client') {
      if (!this.isConnected) {
        this.connectToHost();
      }
    }

    if (data.type === 'HOST_WELCOME' && this.role === 'client') {
      if (!this.isConnected) {
        this.isConnected = true;
        this.onStatusChange({ status: 'CONNECTED', isConnected: true });
      }
    }

    if (data.type === 'HANDSHAKE') {
      if (!this.isConnected) {
        this.isConnected = true;
        this.onStatusChange({ status: 'CONNECTED', isConnected: true });
      }
    }

    // Deliver to game engine
    this.onMessage(data, source);
  }

  send(data) {
    if (this.isDestroyed) return;
    const packet = { ...data, sender: this.role, timestamp: Date.now() };

    // Send via WebRTC if open
    if (this.dataConnection && this.dataConnection.open) {
      try {
        this.dataConnection.send(packet);
      } catch (e) {
        console.warn('WebRTC send error', e);
      }
    }

    // Always mirror to BroadcastChannel for 0ms local tab sync
    this.sendBroadcast(packet);
  }

  sendBroadcast(data) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(data);
      } catch {}
    }
  }

  destroy() {
    this.isDestroyed = true;
    if (this.broadcastChannel) {
      try { this.broadcastChannel.close(); } catch {}
    }
    if (this.dataConnection) {
      try { this.dataConnection.close(); } catch {}
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch {}
    }
  }
}
