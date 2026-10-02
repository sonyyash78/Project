import { Peer } from 'peerjs';

/**
 * SPY HUNT 2–8 Player Real-Time Multiplayer Networking Engine
 * Uses WebRTC DataChannels (PeerJS star topology) + BroadcastChannel instant fallback
 */
export class SpyHuntNetwork {
  constructor({ roomId, playerId, playerName, character, isHost, onMessage, onStatusChange }) {
    this.roomId = roomId.toUpperCase().trim();
    this.playerId = playerId;
    this.playerName = playerName;
    this.character = character;
    this.isHost = isHost;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;

    this.peer = null;
    this.connections = new Map(); // Host: Map<peerId, DataConnection>
    this.hostConnection = null;  // Guest: DataConnection to host
    this.broadcastChannel = null;
    this.isDestroyed = false;

    this.initTransports();
  }

  initTransports() {
    // 1. BroadcastChannel (0ms local dual-window / tab testing)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(`spy_hunt_${this.roomId}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handlePacket(event.data, 'broadcast');
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not active', e);
    }

    // 2. PeerJS WebRTC
    this.initPeer();
  }

  initPeer() {
    try {
      const sanitized = this.roomId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const peerId = this.isHost 
        ? `sphost-${sanitized}`
        : `spguest-${sanitized}-${this.playerId.substring(0, 6)}`;

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
        this.onStatusChange({ status: 'READY', peerId: id, isHost: this.isHost });

        if (!this.isHost) {
          this.connectToHost();
        } else {
          // Announce host readiness
          this.broadcast({
            type: 'HOST_PRESENCE',
            roomId: this.roomId,
            hostId: this.playerId
          });
        }
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('Peer note:', err.type || err);
      });
    } catch (e) {
      console.warn('PeerJS init fallback', e);
    }
  }

  connectToHost() {
    if (!this.peer || this.peer.destroyed) return;
    const sanitized = this.roomId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const hostPeerId = `sphost-${sanitized}`;

    const conn = this.peer.connect(hostPeerId, { reliable: true });
    this.hostConnection = conn;

    conn.on('open', () => {
      this.onStatusChange({ status: 'CONNECTED_TO_HOST', isHost: false });
      // Send join introduction
      this.sendToHost({
        type: 'PLAYER_JOIN_REQUEST',
        playerId: this.playerId,
        playerName: this.playerName,
        character: this.character
      });
    });

    conn.on('data', (data) => {
      this.handlePacket(data, 'webrtc');
    });

    conn.on('close', () => {
      this.onStatusChange({ status: 'HOST_DISCONNECTED', isHost: false });
      this.onMessage({ type: 'HOST_LEFT' });
    });

    // Also send via BroadcastChannel immediately
    this.broadcast({
      type: 'PLAYER_JOIN_REQUEST',
      playerId: this.playerId,
      playerName: this.playerName,
      character: this.character
    });
  }

  handleIncomingConnection(conn) {
    if (!this.isHost) return;

    this.connections.set(conn.peer, conn);

    conn.on('open', () => {
      this.onStatusChange({ status: 'PEER_CONNECTED', peerCount: this.connections.size });
    });

    conn.on('data', (data) => {
      this.handlePacket(data, 'webrtc');
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.onMessage({ type: 'PEER_DISCONNECTED', peerId: conn.peer });
      this.onStatusChange({ status: 'PEER_DISCONNECTED', peerCount: this.connections.size });
    });
  }

  handlePacket(packet, source = 'webrtc') {
    if (!packet || typeof packet !== 'object') return;
    // Discard packets sent by self
    if (packet.senderId === this.playerId) return;
    // Check room code
    if (packet.roomId && packet.roomId !== this.roomId) return;

    this.onMessage(packet, source);
  }

  // Host broadcast to all connected guest players
  broadcast(data) {
    if (this.isDestroyed) return;
    const packet = { ...data, roomId: this.roomId, senderId: this.playerId, timestamp: Date.now() };

    // 1. Send to all WebRTC peers
    if (this.isHost) {
      this.connections.forEach((conn) => {
        if (conn && conn.open) {
          try { conn.send(packet); } catch {}
        }
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      try { this.hostConnection.send(packet); } catch {}
    }

    // 2. BroadcastChannel mirror
    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage(packet); } catch {}
    }
  }

  // Guest sending packet to host
  sendToHost(data) {
    this.broadcast(data);
  }

  destroy() {
    this.isDestroyed = true;
    if (this.broadcastChannel) {
      try { this.broadcastChannel.close(); } catch {}
    }
    if (this.hostConnection) {
      try { this.hostConnection.close(); } catch {}
    }
    this.connections.forEach((conn) => {
      try { conn.close(); } catch {}
    });
    this.connections.clear();
    if (this.peer) {
      try { this.peer.destroy(); } catch {}
    }
  }
}
