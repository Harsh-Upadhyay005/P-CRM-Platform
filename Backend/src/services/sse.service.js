/**
 * SSE (Server-Sent Events) Service
 *
 * Maintains an in-process registry of open SSE connections keyed by userId.
 * Supports multiple simultaneous connections per user (e.g. multiple browser tabs).
 *
 * Usage:
 *   addClient(userId, res)       — register a new SSE response stream
 *   removeClient(userId, res)    — deregister on disconnect
 *   emitToUser(userId, event, data) — push an event to all connections for a user
 */

// Map<userId, Set<res>>
const clients = new Map();

/**
 * Register an SSE response stream for a user.
 */
export const addClient = (userId, res) => {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
};

/**
 * Remove an SSE response stream for a user (called on 'close').
 */
export const removeClient = (userId, res) => {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
};

/**
 * Push an SSE event to all open connections for the given userId.
 *
 * @param {string} userId
 * @param {string} event  — SSE event name (e.g. "notification", "ping")
 * @param {object} data   — JSON-serialisable payload
 */
export const emitToUser = (userId, event, data) => {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      // Dead connection — clean up
      removeClient(userId, res);
    }
  }
};

/**
 * Broadcast a ping to all connected clients (called by heartbeat interval).
 */
export const broadcastPing = () => {
  const payload = `event: ping\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`;
  for (const [userId, set] of clients) {
    for (const res of set) {
      try {
        res.write(payload);
      } catch {
        removeClient(userId, res);
      }
    }
  }
};

/**
 * Total number of open SSE connections (for monitoring / health check).
 */
export const getConnectionCount = () => {
  let total = 0;
  for (const set of clients.values()) total += set.size;
  return total;
};
