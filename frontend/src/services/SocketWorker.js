/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import io from "socket.io-client";
import { getBackendUrl } from "../config";
import { isOfflineMode } from "./offlineMode";
import { resolveSocketAuthToken } from "../helpers/socketAuth";

class SocketWorker {
  constructor(companyId, userId) {
    if (!SocketWorker.instance) {
      this.companyId = Number(companyId);
      this.userId = userId;
      this.authToken = "";
      this.socket = null;
      this.eventListeners = {};
      SocketWorker.instance = this;
    }

    SocketWorker.instance.syncSession(companyId, userId);
    return SocketWorker.instance;
  }

  syncSession(companyId, userId) {
    const nextCompany = Number(companyId);
    const nextToken = resolveSocketAuthToken();
    const companyChanged =
      Number.isFinite(nextCompany) &&
      nextCompany > 0 &&
      Number(this.companyId) !== nextCompany;
    const tokenChanged = nextToken && nextToken !== this.authToken;
    const needsSocket = !this.socket || !this.socket.connected;

    this.userId = userId;
    if (Number.isFinite(nextCompany) && nextCompany > 0) {
      this.companyId = nextCompany;
    }

    if (companyChanged || tokenChanged || needsSocket) {
      this.authToken = nextToken;
      this.configureSocket();
    }
  }

  configureSocket() {
    const backendUrl = getBackendUrl();
    const cid = Number(this.companyId);
    if (!Number.isFinite(cid) || cid <= 0) {
      return;
    }

    const token = resolveSocketAuthToken();
    if (!token) {
      return;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.authToken = token;
    const isLocalDev =
      process.env.NODE_ENV !== "production" || isOfflineMode();

    this.socket = io(`${backendUrl}/${cid}`, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: isLocalDev ? 8 : Infinity,
      timeout: isLocalDev ? 8000 : 20000,
      transports: ["websocket", "polling"],
      query: { userId: this.userId, token },
    });

    this.socket.on("connect", () => {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("Socket.IO conectado", cid);
      }
    });

    this.socket.on("disconnect", (reason) => {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("Socket.IO desconectado:", reason);
      }
      this.reconnectAfterDelay();
    });

    Object.entries(this.eventListeners).forEach(([event, callbacks]) => {
      callbacks.forEach((cb) => {
        this.socket.on(event, cb);
      });
    });
  }

  get connected() {
    return Boolean(this.socket?.connected);
  }

  on(event, callback) {
    this.connect();
    if (!this.socket) return;

    this.socket.on(event, callback);

    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    if (!this.eventListeners[event].includes(callback)) {
      this.eventListeners[event].push(callback);
    }

    if (event === "connect" && this.socket.connected) {
      queueMicrotask(() => {
        if (this.socket?.connected) {
          callback();
        }
      });
    }
  }

  emit(event, data) {
    this.connect();
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  off(event, callback) {
    if (!this.eventListeners[event]) return;

    if (callback) {
      if (this.socket) {
        this.socket.off(event, callback);
      }
      this.eventListeners[event] = this.eventListeners[event].filter(
        (cb) => cb !== callback
      );
      if (this.eventListeners[event].length === 0) {
        delete this.eventListeners[event];
      }
    } else {
      if (this.socket) {
        this.eventListeners[event].forEach((cb) => this.socket.off(event, cb));
      }
      delete this.eventListeners[event];
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners = {};
    SocketWorker.instance = null;
  }

  reconnectAfterDelay() {
    setTimeout(() => {
      const freshToken = resolveSocketAuthToken();
      if (!freshToken) return;

      if (freshToken !== this.authToken) {
        this.authToken = freshToken;
        this.configureSocket();
        return;
      }

      if (!this.socket) {
        this.configureSocket();
        return;
      }

      if (!this.socket.connected) {
        try {
          this.socket.connect();
        } catch {
          this.configureSocket();
        }
      }
    }, 1000);
  }

  connect() {
    this.syncSession(this.companyId, this.userId);
    if (!this.socket) {
      this.configureSocket();
    } else if (!this.socket.connected) {
      try {
        this.socket.connect();
      } catch {
        this.configureSocket();
      }
    }
  }
}

const instance = (companyId, userId) => new SocketWorker(companyId, userId);

export default instance;
