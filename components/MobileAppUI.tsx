/**
 * Mobile App UI — Responsive mobile-optimized interface components.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';

interface MobilePrompt {
  id: string;
  name: string;
  preview: string;
  createdAt: string;
}

interface Props {
  onPromptSelect?: (prompt: MobilePrompt) => void;
}

export default function MobileAppUI({ onPromptSelect: _onPromptSelect }: Props) {
  const { t } = useTranslation();

  const [prompts, setPrompts] = useState<MobilePrompt[]>([]);
  const [currentView, setCurrentView] = useState<'home' | 'create' | 'library' | 'settings'>('home');
  const [_selectedPrompt, setSelectedPrompt] = useState<MobilePrompt | null>(null);
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mobile_prompts');
    if (saved) {
      setPrompts(JSON.parse(saved));
    }
  }, []);

  const savePrompts = (newPrompts: MobilePrompt[]) => {
    setPrompts(newPrompts);
    localStorage.setItem('mobile_prompts', JSON.stringify(newPrompts));
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setResult(`Optimized prompt for: ${inputText.substring(0, 50)}...`);
    setLoading(false);
  };

  const handleSavePrompt = () => {
    if (!result) return;
    const newPrompt: MobilePrompt = {
      id: Date.now().toString(),
      name: inputText.substring(0, 30) + '...',
      preview: result.substring(0, 100),
      createdAt: new Date().toISOString(),
    };
    savePrompts([newPrompt, ...prompts]);
    setResult('');
    setInputText('');
    setCurrentView('home');
  };

  const renderHome = () => (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-cyber-primary/20 to-purple-500/20 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-2 font-display">
          {t.ui.mobileWelcomeTitle}
        </h2>
        <p className="text-gray-400 text-sm">
          {t.ui.mobileWelcomeDesc}
        </p>
      </div>

      <button
        onClick={() => setCurrentView('create')}
        className="w-full p-4 bg-cyber-primary/20 border border-cyber-primary/50 rounded-xl flex items-center gap-4 hover:bg-cyber-primary/30 transition-colors"
      >
        <div className="w-12 h-12 bg-cyber-primary rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-white font-display">{t.ui.mobileNewPromptTitle}</h3>
          <p className="text-sm text-gray-400">{t.ui.mobileNewPromptDesc}</p>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setCurrentView('library')}
          className="p-4 glass-card text-center"
        >
          <svg className="w-8 h-8 mx-auto text-cyber-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-sm text-gray-300">{t.ui.mobileLibraryLabel}</span>
        </button>
        <button className="p-4 glass-card text-center">
          <svg className="w-8 h-8 mx-auto text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-sm text-gray-300">{t.ui.mobileAnalyticsLabel}</span>
        </button>
      </div>

      {prompts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 font-display">{t.ui.mobileRecentPromptsTitle}</h3>
          <div className="space-y-2">
            {prompts.slice(0, 3).map(prompt => (
              <button
                key={prompt.id}
                onClick={() => {
                  setSelectedPrompt(prompt);
                  setCurrentView('create');
                }}
                className="w-full p-3 glass-card text-left hover:opacity-80"
              >
                <p className="text-white text-sm font-medium truncate">{prompt.name}</p>
                <p className="text-gray-500 text-xs mt-1">{new Date(prompt.createdAt).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCreate = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setCurrentView('home')} className="p-2">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-white font-display">{t.ui.mobileCreateTitle}</h2>
      </div>

      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={t.ui.mobileCreatePlaceholder}
        className="glass-input w-full h-40"
      />

      <button
        onClick={handleGenerate}
        disabled={!inputText.trim() || loading}
        className="w-full py-3 bg-cyber-primary text-black font-semibold rounded-xl hover:bg-cyber-primary/80 disabled:opacity-50"
      >
        {loading ? t.ui.mobileGenerateBtnLoading : t.ui.mobileGenerateBtn}
      </button>

      {result && (
        <div className="p-4 glass-card">
          <h4 className="text-sm font-semibold text-cyber-primary mb-2">{t.ui.mobileResultLabel}</h4>
          <p className="text-white text-sm whitespace-pre-wrap">{result}</p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="flex-1 py-2 bg-gray-700 rounded-lg text-sm"
            >
              {t.ui.mobileCopyBtn}
            </button>
            <button
              onClick={handleSavePrompt}
              className="flex-1 py-2 bg-cyber-primary text-black font-semibold rounded-lg text-sm"
            >
              {t.ui.mobileSaveBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderLibrary = () => (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setCurrentView('home')} className="p-2">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-white font-display">{t.ui.mobileLibraryTitle}</h2>
      </div>

      {prompts.length === 0 ? (
        <p className="text-center text-gray-500 py-8">{t.ui.mobileLibraryEmpty}</p>
      ) : (
        <div className="space-y-3">
          {prompts.map(prompt => (
            <div key={prompt.id} className="p-4 glass-card">
              <h4 className="font-semibold text-white mb-1">{prompt.name}</h4>
              <p className="text-gray-400 text-sm">{prompt.preview}</p>
              <p className="text-gray-500 text-xs mt-2">{new Date(prompt.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setCurrentView('home')} className="p-2">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-white font-display">{t.ui.mobileSettingsTitle}</h2>
      </div>

      <div className="space-y-2">
        <button className="w-full p-4 glass-card flex items-center justify-between">
          <span className="text-white">{t.ui.mobileLangLabel}</span>
          <span className="text-gray-400">{t.ui.mobileLangValue}</span>
        </button>
        <button className="w-full p-4 glass-card flex items-center justify-between">
          <span className="text-white">{t.ui.mobileThemeLabel}</span>
          <span className="text-gray-400">Cyberpunk</span>
        </button>
        <button className="w-full p-4 glass-card flex items-center justify-between">
          <span className="text-white">{t.ui.mobileNotificationsLabel}</span>
          <span className="text-gray-400">On</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-cyber-black min-h-screen rounded-3xl overflow-hidden border border-gray-800">
      <div className="bg-cyber-dark p-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-cyber-primary font-display">Super Reasoning</h1>
        <button onClick={() => setCurrentView('settings')} className="p-2">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <div className="min-h-[calc(100vh-120px)] overflow-y-auto">
        {currentView === 'home' && renderHome()}
        {currentView === 'create' && renderCreate()}
        {currentView === 'library' && renderLibrary()}
        {currentView === 'settings' && renderSettings()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-cyber-dark border-t border-gray-800 p-2 flex justify-around">
        <button
          onClick={() => setCurrentView('home')}
          className={`p-3 rounded-xl ${currentView === 'home' ? 'text-cyber-primary' : 'text-gray-500'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentView('create')}
          className={`p-3 rounded-xl ${currentView === 'create' ? 'text-cyber-primary' : 'text-gray-500'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentView('library')}
          className={`p-3 rounded-xl ${currentView === 'library' ? 'text-cyber-primary' : 'text-gray-500'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentView('settings')}
          className={`p-3 rounded-xl ${currentView === 'settings' ? 'text-cyber-primary' : 'text-gray-500'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
