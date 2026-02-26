import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { requireAnyAuth } from '../middleware';
import { asyncHandler } from '../lib/asyncHandler';
import {
  CollaborationSession,
  User,
  Cursor,
  Comment,
  WebSocketMessage
} from '../../types/collaboration';

const router = express.Router();

// In-memory session storage (production'da Redis'e taşıın)
const sessions = new Map<string, CollaborationSession>();
const clientConnections = new Map<WebSocket, { userId: string; sessionId: string }>();

// Helper functions
const generateUserColor = (userId: string): string => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const createSession = (promptId: string, owner: User): CollaborationSession => {
  const session: CollaborationSession = {
    id: uuidv4(),
    promptId,
    users: [owner],
    content: '',
    cursors: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: owner.id,
    isPublic: false,
    shareLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/collaborate/${uuidv4()}`
  };

  sessions.set(session.id, session);
  return session;
};

const getSession = (sessionId: string): CollaborationSession | null => {
  return sessions.get(sessionId) || null;
};

const addUserToSession = (session: CollaborationSession, user: User): void => {
  if (!session.users.find(u => u.id === user.id)) {
    session.users.push(user);
    session.updatedAt = new Date();
  }
};

const removeUserFromSession = (session: CollaborationSession, userId: string): void => {
  session.users = session.users.filter(u => u.id !== userId);
  session.cursors = session.cursors.filter(c => c.userId !== userId);
  session.updatedAt = new Date();
};

const broadcastToSession = (sessionId: string, message: WebSocketMessage, excludeWs?: WebSocket): void => {
  clientConnections.forEach((client, ws) => {
    if (client.sessionId === sessionId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
};

// REST API Routes
router.post('/sessions', requireAnyAuth, asyncHandler(async (req, res) => {
    const { promptId } = req.body;
    const userId = req.authUser?.userId;

    if (!promptId || !userId) {
      return res.status(400).json({ error: 'Missing promptId or userId' });
    }

    // Check if session already exists for this prompt and user
    const existingSession = Array.from(sessions.values()).find(
      s => s.promptId === promptId && s.users.some(u => u.id === userId)
    );

    if (existingSession) {
      return res.json(existingSession);
    }

    const user: User = {
      id: userId,
      name: req.authUser?.email || 'Unknown',
      email: req.authUser?.email || '',
      color: generateUserColor(userId),
      role: 'owner',
      lastSeen: new Date()
    };

    const session = createSession(promptId, user);
    res.json(session);
}));

router.get('/sessions/:sessionId', requireAnyAuth, asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId as string;
    const session = getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
}));

router.post('/sessions/:sessionId/join', requireAnyAuth, asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId as string;
    const session = getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const userId = req.authUser?.userId || uuidv4();
    const user: User = {
      id: userId,
      name: req.authUser?.email || 'Anonymous',
      email: req.authUser?.email || '',
      color: generateUserColor(userId),
      role: 'editor',
      lastSeen: new Date()
    };

    addUserToSession(session, user);
    res.json({ session, user });
}));

// WebSocket Server Setup
export const setupCollaborationWebSocket = (server: any) => {
  const wss = new WebSocketServer({
    server,
    path: '/ws/collaborate'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const sessionId = url.searchParams.get('sessionId') as string;
    const userId = url.searchParams.get('userId') as string;

    if (!sessionId || !userId) {
      ws.close(1008, 'Missing sessionId or userId');
      return;
    }

    const session = getSession(sessionId);
    if (!session) {
      ws.close(1008, 'Session not found');
      return;
    }

    // Store connection
    clientConnections.set(ws, { userId, sessionId });

    // Add user to session
    const user: User = {
      id: userId,
      name: `User_${userId.slice(0, 8)}`,
      email: '',
      color: generateUserColor(userId),
      role: 'editor',
      lastSeen: new Date()
    };

    addUserToSession(session, user);

    // Notify others
    const joinMessage: WebSocketMessage = {
      type: 'user_joined',
      payload: { user },
      userId,
      timestamp: new Date()
    };

    broadcastToSession(sessionId, joinMessage, ws);

    // Send current session state to new user
    const initStateMessage: WebSocketMessage = {
      type: 'session_updated',
      payload: { session },
      userId,
      timestamp: new Date()
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(initStateMessage));
    }

    // Handle messages
    ws.on('message', (data: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(data);

        switch (message.type) {
          case 'cursor_update': {
            const cursor = message.payload as Cursor;
            session.cursors = session.cursors.filter(c => c.userId !== cursor.userId);
            session.cursors.push(cursor);
            session.updatedAt = new Date();
            break;
          }

          case 'content_change':
            session.content = message.payload.content;
            session.updatedAt = new Date();
            break;

          case 'comment_added': {
            const comment = message.payload as Comment;
            session.comments.push(comment);
            session.updatedAt = new Date();
            break;
          }

          case 'comment_resolved': {
            const commentId = message.payload.commentId;
            const targetComment = session.comments.find(c => c.id === commentId);
            if (targetComment) {
              targetComment.resolved = true;
              session.updatedAt = new Date();
            }
            break;
          }
        }

        // Broadcast to all other clients in session
        broadcastToSession(sessionId, message, ws);

      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      removeUserFromSession(session, userId);
      clientConnections.delete(ws);

      const leaveMessage: WebSocketMessage = {
        type: 'user_left',
        payload: { userId },
        userId,
        timestamp: new Date()
      };

      broadcastToSession(sessionId, leaveMessage);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Cleanup inactive sessions periodically
  setInterval(() => {
    const now = new Date();
    sessions.forEach((session, sessionId) => {
      // Remove sessions inactive for more than 24 hours
      if (now.getTime() - session.updatedAt.getTime() > 24 * 60 * 60 * 1000) {
        sessions.delete(sessionId);
      }
    });
  }, 60 * 60 * 1000); // Check every hour
};

export default router;
