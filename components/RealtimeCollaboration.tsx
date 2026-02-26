/**
 * Real-time Collaboration — Multi-user prompt editing with cursor tracking.
 * Uses WebSocket for live updates and presence indicators.
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '../services/apiClient';
const WS_PROTO = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_HOST = typeof window !== 'undefined' ? window.location.host : 'localhost:4100';

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursorPosition: number;
  selectionStart?: number;
  selectionEnd?: number;
  lastActive: number;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  position: number;
  createdAt: string;
  resolved: boolean;
}

interface Props {
  initialPrompt?: string;
  promptId?: string;
  onSave?: (prompt: string) => void;
  readOnly?: boolean;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

export default function RealtimeCollaboration({ initialPrompt = '', promptId, onSave, readOnly = false }: Props) {
  const { t } = useTranslation();

  const [prompt, setPrompt] = useState(initialPrompt);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [userId] = useState(() => Math.random().toString(36).substring(7));
  const [userName, setUserName] = useState('');
  const [userColor] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const cursorPosRef = useRef<number>(0);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const headers = await getAuthHeaders();

      // Load comments if promptId provided
      if (promptId) {
        try {
          const res = await fetch(`${API_BASE}/prompts/${promptId}/comments`, { headers });
          if (res.ok) {
            const data = await res.json();
            setComments(data.comments || []);
          }
        } catch (e) {
          console.error('Failed to load comments:', e);
        }
      }
    };
    loadData();
  }, [promptId]);

  // WebSocket connection
  useEffect(() => {
    if (!promptId) return;

    const ws = new WebSocket(`${WS_PROTO}//${WS_HOST}/ws/collaborate?sessionId=${promptId}&userId=${userId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      ws.send(JSON.stringify({
        type: 'join',
        sessionId,
        userId,
        userName: userName || 'Anonymous',
        color: userColor,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'presence':
            setCollaborators(data.collaborators || []);
            break;
          case 'cursor':
            setCollaborators(prev =>
              prev.map(c => c.id === data.userId ? { ...c, cursorPosition: data.position } : c)
            );
            break;
          case 'edit':
            if (data.userId !== userId) {
              setPrompt(data.prompt);
            }
            break;
          case 'comment':
            if (data.action === 'add') {
              setComments(prev => [...prev, data.comment]);
            } else if (data.action === 'resolve') {
              setComments(prev => prev.map(c => c.id === data.commentId ? { ...c, resolved: true } : c));
            }
            break;
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    };

    ws.onclose = () => setConnectionStatus('disconnected');
    ws.onerror = () => setConnectionStatus('disconnected');

    return () => {
      ws.send(JSON.stringify({ type: 'leave', sessionId, userId }));
      ws.close();
    };
  }, [promptId, sessionId, userId, userName, userColor]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setPrompt(newValue);

    // Send edit via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'edit',
        prompt: newValue,
        userId,
      }));
    }

    onSave?.(newValue);
  };

  const handleCursorChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    cursorPosRef.current = target.selectionStart;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        position: target.selectionStart,
        userId,
      }));
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || selectedPosition === null) return;

    const comment: Comment = {
      id: Math.random().toString(36).substring(7),
      userId,
      userName: userName || 'Anonymous',
      text: newComment,
      position: selectedPosition,
      createdAt: new Date().toISOString(),
      resolved: false,
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
    setSelectedPosition(null);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'comment',
        action: 'add',
        comment,
      }));
    }
  };

  const handleResolveComment = (commentId: string) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved: true } : c));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'comment',
        action: 'resolve',
        commentId,
      }));
    }
  };

  const renderCollaboratorCursors = () => {
    return collaborators
      .filter(c => c.id !== userId)
      .map(c => {
        const textarea = textareaRef.current;
        if (!textarea) return null;

        // Approximate cursor position (simplified)
        const lines = prompt.substring(0, c.cursorPosition).split('\n');
        const lineHeight = 24;
        const charWidth = 8;

        const top = (lines.length - 1) * lineHeight;
        const left = lines[lines.length - 1].length * charWidth + 16;

        return (
          <div
            key={c.id}
            className="absolute pointer-events-none"
            style={{ top, left }}
          >
            <div className="w-0.5 h-6" style={{ backgroundColor: c.color }} />
            <div
              className="absolute -top-5 left-0 px-1 py-0.5 text-xs text-white rounded whitespace-nowrap"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
            </div>
          </div>
        );
      });
  };

  return (
    <div className="flex flex-col h-full glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-glass-bg border-b border-glass-border">
        <div className="flex items-center gap-4">
          <h3 className="font-display font-semibold text-white">
            {t.ui.collabTitle}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-gray-400">
              {connectionStatus === 'connected' ? t.ui.collabConnected :
               connectionStatus === 'connecting' ? t.ui.collabConnecting : t.ui.collabDisconnected}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User name input */}
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder={t.ui.collabNamePlaceholder}
            className="px-3 py-1 bg-black/30 border border-glass-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-primary"
          />

          {/* Collaborators */}
          <div className="flex items-center gap-1">
            {collaborators.filter(c => c.id !== userId).map(c => (
              <div
                key={c.id}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: c.color }}
                title={c.name}
              >
                {c.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          {/* Comments toggle */}
          <button
            onClick={() => setShowComments(!showComments)}
            className={`p-2 rounded ${showComments ? 'bg-cyber-primary/20 text-cyber-primary' : 'text-gray-400 hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleTextChange}
            onSelect={handleCursorChange}
            onClick={handleCursorChange}
            onKeyUp={handleCursorChange}
            readOnly={readOnly}
            className="w-full h-full p-4 bg-transparent text-white font-mono text-sm resize-none focus:outline-none"
            placeholder={t.ui.collabPromptPlaceholder}
          />

          {/* Collaborator cursors */}
          {renderCollaboratorCursors()}
        </div>

        {/* Comments sidebar */}
        {showComments && (
          <div className="w-72 border-l border-glass-border bg-cyber-dark/50 overflow-y-auto">
            <div className="p-3 border-b border-glass-border">
              <h4 className="font-display font-semibold text-white">
                {t.ui.collabCommentsLabel} ({comments.filter(c => !c.resolved).length})
              </h4>
            </div>

            <div className="p-3 space-y-3">
              {comments.map(comment => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg ${comment.resolved ? 'bg-glass-bg opacity-50' : 'bg-glass-bg'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{comment.userName}</span>
                    <button
                      onClick={() => handleResolveComment(comment.id)}
                      className="text-xs text-cyber-primary hover:underline"
                    >
                      {t.ui.collabResolveBtn}
                    </button>
                  </div>
                  <p className="text-sm text-gray-300">{comment.text}</p>
                  <span className="text-xs text-gray-500 mt-2 block">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}

              {comments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  {t.ui.collabNoComments}
                </p>
              )}
            </div>

            {/* Add comment */}
            {selectedPosition !== null && (
              <div className="p-3 border-t border-glass-border">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t.ui.collabCommentPlaceholder}
                  className="w-full px-3 py-2 bg-black/30 border border-glass-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyber-primary resize-none h-20"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setSelectedPosition(null)}
                    className="px-3 py-1 text-sm text-gray-400 hover:text-white"
                  >
                    {t.ui.collabCancel}
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-3 py-1 text-sm bg-cyber-primary text-black font-semibold rounded hover:bg-cyber-primary/80 disabled:opacity-50"
                  >
                    {t.ui.collabAddBtn}
                  </button>
                </div>
              </div>
            )}

            {selectedPosition === null && (
              <div className="p-3 border-t border-glass-border">
                <p className="text-xs text-gray-500 text-center">
                  {t.ui.collabSelectPosition}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add comment hint */}
      {selectedPosition === null && (
        <div className="px-4 py-2 bg-cyber-dark border-t border-glass-border">
          <button
            onClick={() => setSelectedPosition(cursorPosRef.current)}
            className="text-sm text-cyber-primary hover:underline"
          >
            + {t.ui.collabAddCommentBtn}
          </button>
        </div>
      )}
    </div>
  );
}
