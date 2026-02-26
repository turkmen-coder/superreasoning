import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastSystem';
import { useTranslation } from '../i18n';
import { User, Cursor, Comment } from '../types/collaboration';

interface CollaborationEditorProps {
  initialContent?: string;
  promptId?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
}

const CollaborationEditor: React.FC<CollaborationEditorProps> = ({
  initialContent = '',
  promptId,
  onSave,
  readOnly = false
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t: _t } = useTranslation();

  const [content, setContent] = useState(initialContent);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [_shareLink, setShareLink] = useState('');

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket bağlantısı
  useEffect(() => {
    if (!promptId || readOnly) return;

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws/collaborate?sessionId=${promptId}&userId=${user?.id || 'anon'}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      addToast('Collaboration session started', 'success');
    };

    wsRef.current.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'user_joined':
          setActiveUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user]);
          break;
        case 'user_left':
          setActiveUsers(prev => prev.filter(u => u.id !== data.userId));
          break;
        case 'cursor_update':
          setCursors(prev => [...prev.filter(c => c.userId !== data.cursor.userId), data.cursor]);
          break;
        case 'content_change':
          setContent(data.content);
          break;
        case 'comment_added':
          setComments(prev => [...prev, data.comment]);
          break;
      }
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      addToast('Collaboration session ended', 'info');
    };

    return () => {
      wsRef.current?.close();
    };
  }, [promptId, readOnly]);

  // Content değişikliklerini gönder
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'content_change',
        content: newContent,
        userId: user?.id
      }));
    }
  }, [user?.id]);

  // Cursor pozisyonunu gönder
  const handleCursorMove = useCallback((position: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor_update',
        cursor: {
          userId: user?.id,
          position,
          selection: undefined
        }
      }));
    }
  }, [user?.id]);

  // Yorum ekle
  const addComment = useCallback((position: number, text: string) => {
    const comment: Comment = {
      id: Date.now().toString(),
      userId: user?.id || '',
      content: text,
      position,
      timestamp: new Date(),
      resolved: false
    };

    setComments(prev => [...prev, comment]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'comment_added',
        comment
      }));
    }
  }, [user?.id]);

  // Share link oluştur
  const generateShareLink = useCallback(() => {
    const link = `${window.location.origin}/collaborate/${promptId}`;
    setShareLink(link);
    navigator.clipboard.writeText(link);
    addToast('Share link copied to clipboard!', 'success');
  }, [promptId]);

  // User color generator
  const getUserColor = (userId: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex h-full glass-card">
      {/* Sol Panel - Editör */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-primary/20">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-cyber-primary text-sm font-mono">
                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <div className="flex -space-x-2">
              {activeUsers.map(user => (
                <div
                  key={user.id}
                  className="w-8 h-8 rounded-full border-2 border-cyber-black flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowComments(!showComments)}
              className="px-3 py-1 bg-cyber-primary/10 hover:bg-cyber-primary/20 text-cyber-primary rounded text-sm font-mono transition-colors"
            >
              {comments.length} Comments
            </button>

            <button
              onClick={generateShareLink}
              className="px-3 py-1 bg-cyber-primary/10 hover:bg-cyber-primary/20 text-cyber-primary rounded text-sm font-mono transition-colors"
            >
              Share
            </button>

            {onSave && (
              <button
                onClick={() => onSave(content)}
                className="px-3 py-1 bg-cyber-primary hover:bg-cyber-primary/80 text-cyber-black rounded text-sm font-mono transition-colors"
              >
                Save
              </button>
            )}
          </div>
        </div>

        {/* Editör */}
        <div className="flex-1 relative">
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onSelect={(e) => handleCursorMove(e.currentTarget.selectionStart)}
            readOnly={readOnly}
            className="glass-input w-full h-full font-mono text-sm resize-none rounded-b-lg"
            placeholder="Start typing your prompt here..."
          />

          {/* Cursor indicators */}
          {cursors.map(cursor => (
            <div
              key={cursor.userId}
              className="absolute w-0.5 h-5 animate-pulse"
              style={{
                left: `${cursor.position * 8}px`, // Approximate character width
                top: '20px',
                backgroundColor: getUserColor(cursor.userId)
              }}
            />
          ))}
        </div>
      </div>

      {/* Sağ Panel - Comments */}
      {showComments && (
        <div className="w-80 border-l border-cyber-primary/20 flex flex-col">
          <div className="p-4 border-b border-cyber-primary/20">
            <h3 className="text-cyber-primary font-mono text-sm font-bold font-display">COMMENTS</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {comments.map(comment => (
              <div key={comment.id} className="glass-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyber-primary text-xs font-mono">
                    {activeUsers.find(u => u.id === comment.userId)?.name || 'Unknown'}
                  </span>
                  <span className="text-cyber-primary/50 text-xs font-mono">
                    {new Date(comment.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-cyber-primary/80 text-sm font-mono">{comment.content}</p>
                <div className="mt-2 text-xs text-cyber-primary/50 font-mono">
                  Line: {Math.floor(comment.position / 50) + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment */}
          <div className="p-4 border-t border-cyber-primary/20">
            <textarea
              placeholder="Add a comment..."
              className="glass-input w-full font-mono text-sm resize-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  const text = e.currentTarget.value.trim();
                  if (text) {
                    addComment(editorRef.current?.selectionStart || 0, text);
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
            <div className="text-xs text-cyber-primary/50 font-mono mt-1">
              Press Cmd+Enter to add comment
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationEditor;
