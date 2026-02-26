import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastSystem';
import { useTranslation } from '../i18n';

interface VoiceRecording {
  id: string;
  blob: Blob;
  duration: number;
  transcript: string;
  timestamp: Date;
}

interface VisualElement {
  id: string;
  type: 'image' | 'video' | 'diagram' | 'chart';
  url: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
  prompt?: string;
}

interface MultiModalHubProps {
  onPromptGenerated?: (prompt: string, metadata: any) => void;
  initialPrompt?: string;
}

const MultiModalHub: React.FC<MultiModalHubProps> = ({
  onPromptGenerated,
  initialPrompt = ''
}) => {
  const { session: _session } = useAuth();
  const { addToast } = useToast();
  const { t, language } = useTranslation();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [visualElements, setVisualElements] = useState<VisualElement[]>([]);
  const [promptText, setPromptText] = useState(initialPrompt);
  const [selectedMode, setSelectedMode] = useState<'voice' | 'visual' | 'hybrid'>('hybrid');
  const [isListening, setIsListening] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const duration = Date.now() - recordingStartTime;

        // Simulate transcription - gerçek uygulamada speech-to-text API kullanılacak
        const mockTranscript = await transcribeAudio(audioBlob);

        const recording: VoiceRecording = {
          id: Date.now().toString(),
          blob: audioBlob,
          duration,
          transcript: mockTranscript,
          timestamp: new Date()
        };

        setRecordings(prev => [...prev, recording]);
        setPromptText(prev => prev + (prev ? ' ' : '') + mockTranscript);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        addToast(
          language === 'tr' ? 'Ses kaydedildi ve metne dönüştürüldü' : 'Voice recorded and transcribed',
          'success'
        );
      };

      const recordingStartTime = Date.now();
      mediaRecorder.start();
      setIsRecording(true);
      setIsListening(true);

    } catch (error) {
      console.error('Error starting recording:', error);
      addToast(
        language === 'tr' ? 'Mikrofon erişimi reddedildi' : 'Microphone access denied',
        'error'
      );
    }
  }, [language, addToast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
    }
  }, [isRecording]);

  const transcribeAudio = async (_audioBlob: Blob): Promise<string> => {
    // Mock transcription - gerçek uygulamada API çağrısı yapılacak
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockTranscriptions = language === 'tr' ? [
      'Yapay zeka destekli kod üretme aracı oluştur',
      'React bileşeni için state management optimize et',
      'Kullanıcı dostu arayüz tasarımı prompt\'u yaz',
      'Veritabanı performansını artıran SQL sorguları oluştur',
      'Makine öğrenmesi modeli için eğitim verisi hazırla'
    ] : [
      'Create an AI-powered code generation tool',
      'Optimize state management for React components',
      'Write a user-friendly interface design prompt',
      'Generate SQL queries to improve database performance',
      'Prepare training data for machine learning model'
    ];

    return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
  };

  // Visual element functions
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;

          const visualElement: VisualElement = {
            id: Date.now().toString() + Math.random(),
            type: file.type.startsWith('image/') ? 'image' : 'video',
            url,
            metadata: {
              width: 0, // Will be updated after loading
              height: 0,
              size: file.size,
              format: file.type
            }
          };

          // Get image dimensions
          if (file.type.startsWith('image/')) {
            const img = new Image();
            img.onload = () => {
              visualElement.metadata.width = img.width;
              visualElement.metadata.height = img.height;
              setVisualElements(prev => [...prev, visualElement]);
            };
            img.src = url;
          } else {
            setVisualElements(prev => [...prev, visualElement]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const generatePromptFromVisuals = useCallback(async () => {
    if (visualElements.length === 0) {
      addToast(
        language === 'tr' ? 'Lütfen önce görsel yükleyin' : 'Please upload visual elements first',
        'info'
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Mock AI analysis - gerçek uygulamada vision API kullanılacak
      await new Promise(resolve => setTimeout(resolve, 2000));

      const visualDescriptions = visualElements.map(element =>
        element.type === 'image'
          ? language === 'tr'
            ? `Görsel (${element.metadata.width}x${element.metadata.height})`
            : `Image (${element.metadata.width}x${element.metadata.height})`
          : language === 'tr'
            ? `Video (${element.metadata.width}x${element.metadata.height})`
            : `Video (${element.metadata.width}x${element.metadata.height})`
      ).join(', ');

      const generatedPrompt = language === 'tr'
        ? `Aşağıdaki görsel elementlerini içeren bir prompt oluştur: ${visualDescriptions}. Kullanıcı arayüzü, modern tasarım prensipleri ve en iyi pratiklere odaklan.`
        : `Create a prompt that incorporates the following visual elements: ${visualDescriptions}. Focus on user interface, modern design principles, and best practices.`;

      setPromptText(generatedPrompt);

      if (onPromptGenerated) {
        onPromptGenerated(generatedPrompt, {
          source: 'visual',
          elements: visualElements.length,
          totalSize: visualElements.reduce((sum, el) => sum + el.metadata.size, 0)
        });
      }

      addToast(
        language === 'tr' ? 'Görsellerden prompt üretildi' : 'Prompt generated from visuals',
        'success'
      );

    } catch (error) {
      console.error('Error generating prompt from visuals:', error);
      addToast(
        language === 'tr' ? 'Prompt üretilemedi' : 'Failed to generate prompt',
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [visualElements, language, onPromptGenerated, addToast]);

  // Drawing canvas functions
  const startDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      lastX = currentX;
      lastY = currentY;
    };

    const handleMouseUp = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseout', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseout', handleMouseUp);
    };
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const saveCanvasAsImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const visualElement: VisualElement = {
        id: Date.now().toString(),
        type: 'image',
        url,
        metadata: {
          width: canvas.width,
          height: canvas.height,
          size: blob.size,
          format: 'image/png'
        }
      };

      setVisualElements(prev => [...prev, visualElement]);
      clearCanvas();

      addToast(
        language === 'tr' ? 'Çizim kaydedildi' : 'Drawing saved',
        'success'
      );
    });
  }, [clearCanvas, language, addToast]);

  const removeVisualElement = useCallback((id: string) => {
    setVisualElements(prev => prev.filter(el => el.id !== id));
  }, []);

  const removeRecording = useCallback((id: string) => {
    setRecordings(prev => prev.filter(rec => rec.id !== id));
  }, []);

  // Generate hybrid prompt from voice and visuals
  const generateHybridPrompt = useCallback(async () => {
    setIsProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const voiceContent = recordings.map(rec => rec.transcript).join(' ');
      const visualCount = visualElements.length;

      const hybridPrompt = language === 'tr'
        ? `Çoklu modalite girdisiyle prompt oluştur:\n\nSes içeriği: "${voiceContent}"\nGörsel element sayısı: ${visualCount}\n\nBu girdileri birleştirerek kapsamlı ve etkili bir prompt oluştur.`
        : `Create prompt with multi-modal input:\n\nVoice content: "${voiceContent}"\nVisual element count: ${visualCount}\n\nCombine these inputs to create a comprehensive and effective prompt.`;

      setPromptText(hybridPrompt);

      if (onPromptGenerated) {
        onPromptGenerated(hybridPrompt, {
          source: 'hybrid',
          voiceRecordings: recordings.length,
          visualElements: visualElements.length,
          totalDuration: recordings.reduce((sum, rec) => sum + rec.duration, 0)
        });
      }

      addToast(
        language === 'tr' ? 'Hibrit prompt üretildi' : 'Hybrid prompt generated',
        'success'
      );

    } catch (error) {
      console.error('Error generating hybrid prompt:', error);
      addToast(
        language === 'tr' ? 'Hibrit prompt üretilemedi' : 'Failed to generate hybrid prompt',
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [recordings, visualElements, language, onPromptGenerated, addToast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-lg font-bold text-cyber-primary uppercase tracking-wider">
          {t.ui.multiModalTitle}
        </h3>

        {/* Mode Selector */}
        <div className="flex bg-cyber-dark border border-cyber-primary/30 rounded-lg p-1">
          {(['voice', 'visual', 'hybrid'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider transition-all ${
                selectedMode === mode
                  ? 'bg-cyber-primary text-cyber-black'
                  : 'text-cyber-primary hover:bg-cyber-primary/10'
              }`}
            >
              {mode === 'voice' ? t.ui.multiModalVoice :
               mode === 'visual' ? t.ui.multiModalVisual : t.ui.multiModalHybrid}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Recording Section */}
      {selectedMode === 'voice' || selectedMode === 'hybrid' ? (
        <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6 space-y-4">
          <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider">
            {t.ui.multiModalVoiceRecording}
          </h4>

          <div className="flex items-center gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-6 py-3 rounded-lg font-mono text-sm uppercase tracking-wider transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-cyber-primary hover:bg-cyber-primary/80 text-cyber-black'
              }`}
            >
              {isRecording ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  {t.ui.multiModalStopBtn}
                </span>
              ) : (
                t.ui.multiModalRecordBtn
              )}
            </button>

            {isListening && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 font-mono text-sm">
                  {t.ui.multiModalListening}
                </span>
              </div>
            )}
          </div>

          {/* Recordings List */}
          {recordings.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-mono text-xs text-cyber-primary/60 uppercase">
                {t.ui.multiModalRecordingsLabel}
              </h5>
              {recordings.map((recording) => (
                <div key={recording.id} className="flex items-center justify-between bg-cyber-black/50 rounded p-3">
                  <div className="flex-1">
                    <p className="text-cyber-primary font-mono text-sm">
                      {recording.transcript}
                    </p>
                    <p className="text-cyber-primary/40 text-xs font-mono">
                      {Math.round(recording.duration / 1000)}s • {recording.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeRecording(recording.id)}
                    className="text-red-400 hover:text-red-300 font-mono text-xs"
                  >
                    {t.ui.multiModalRemoveBtn}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Visual Elements Section */}
      {selectedMode === 'visual' || selectedMode === 'hybrid' ? (
        <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6 space-y-4">
          <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider">
            {t.ui.multiModalVisualElements}
          </h4>

          {/* File Upload */}
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-cyber-primary hover:bg-cyber-primary/80 text-cyber-black rounded font-mono text-sm uppercase tracking-wider"
            >
              {t.ui.multiModalUploadBtn}
            </button>
          </div>

          {/* Drawing Canvas */}
          <div className="space-y-2">
            <h5 className="font-mono text-xs text-cyber-primary/60 uppercase">
              {t.ui.multiModalDrawingPanel}
            </h5>
            <canvas
              ref={canvasRef}
              width={600}
              height={300}
              className="w-full border border-cyber-primary/30 rounded bg-cyber-black cursor-crosshair"
              onMouseDown={startDrawing}
            />
            <div className="flex gap-2">
              <button
                onClick={saveCanvasAsImage}
                className="px-3 py-1 bg-cyber-primary hover:bg-cyber-primary/80 text-cyber-black rounded font-mono text-xs"
              >
                {t.ui.multiModalSaveDrawing}
              </button>
              <button
                onClick={clearCanvas}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded font-mono text-xs"
              >
                {t.ui.multiModalClear}
              </button>
            </div>
          </div>

          {/* Visual Elements Grid */}
          {visualElements.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-mono text-xs text-cyber-primary/60 uppercase">
                {t.ui.multiModalUploadedElements}
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {visualElements.map((element) => (
                  <div key={element.id} className="relative group">
                    {element.type === 'image' ? (
                      <img
                        src={element.url}
                        alt="Visual element"
                        className="w-full h-32 object-cover rounded border border-cyber-primary/30"
                      />
                    ) : (
                      <video
                        src={element.url}
                        className="w-full h-32 object-cover rounded border border-cyber-primary/30"
                        controls
                      />
                    )}
                    <button
                      onClick={() => removeVisualElement(element.id)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-2 left-2 bg-cyber-black/80 text-cyber-primary text-xs font-mono px-2 py-1 rounded">
                      {element.type === 'image' ? 'IMG' : 'VID'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Generated Prompt Display */}
      <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6">
        <h4 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider mb-4">
          {t.ui.multiModalGeneratedPrompt}
        </h4>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder={t.ui.multiModalGeneratedPromptPlaceholder}
          className="w-full h-32 bg-cyber-black border border-cyber-primary/30 rounded p-4 text-cyber-primary font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyber-primary/50"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {selectedMode === 'visual' && (
          <button
            onClick={generatePromptFromVisuals}
            disabled={isProcessing || visualElements.length === 0}
            className="px-6 py-3 bg-cyber-primary hover:bg-cyber-primary/80 disabled:bg-cyber-primary/30 disabled:cursor-not-allowed text-cyber-black rounded font-mono text-sm uppercase tracking-wider transition-all"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-cyber-black border-t-transparent rounded-full animate-spin" />
                {t.ui.multiModalProcessing}
              </span>
            ) : (
              t.ui.multiModalGenerateFromVisuals
            )}
          </button>
        )}

        {selectedMode === 'hybrid' && (
          <button
            onClick={generateHybridPrompt}
            disabled={isProcessing || (recordings.length === 0 && visualElements.length === 0)}
            className="px-6 py-3 bg-cyber-primary hover:bg-cyber-primary/80 disabled:bg-cyber-primary/30 disabled:cursor-not-allowed text-cyber-black rounded font-mono text-sm uppercase tracking-wider transition-all"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-cyber-black border-t-transparent rounded-full animate-spin" />
                {t.ui.multiModalProcessing}
              </span>
            ) : (
              t.ui.multiModalGenerateHybrid
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default MultiModalHub;
