export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  lastSeen: Date;
}

export interface Cursor {
  userId: string;
  position: number;
  selection?: { start: number; end: number };
  timestamp: Date;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  position: number;
  timestamp: Date;
  resolved: boolean;
  replies?: Comment[];
}

export interface CollaborationSession {
  id: string;
  promptId: string;
  users: User[];
  content: string;
  cursors: Cursor[];
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  isPublic: boolean;
  shareLink?: string;
}

export interface WebSocketMessage {
  type: 'user_joined' | 'user_left' | 'cursor_update' | 'content_change' | 'comment_added' | 'comment_resolved' | 'session_updated';
  payload: any;
  userId: string;
  timestamp: Date;
}

export interface CollaborationEvent {
  id: string;
  sessionId: string;
  userId: string;
  type: 'join' | 'leave' | 'edit' | 'comment' | 'cursor_move';
  data: any;
  timestamp: Date;
}

export interface Permission {
  userId: string;
  sessionId: string;
  role: 'owner' | 'editor' | 'viewer';
  canInvite: boolean;
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
}
