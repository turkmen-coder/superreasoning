import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import {
  getStyleProfiles,
  saveStyleProfile,
  deleteStyleProfile,
  getActiveProfileId,
  setActiveProfileId,
  addExampleToProfile,
} from '../services/styleProfiles';
import type { StyleProfile } from '../types';

const StyleProfileManager: React.FC = () => {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<StyleProfile[]>(() => getStyleProfiles());
  const [activeId, setActiveId] = useState(() => getActiveProfileId());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTone, setNewTone] = useState('');
  const [exampleInput, setExampleInput] = useState('');
  const [exampleOutput, setExampleOutput] = useState('');
  const [addingForId, setAddingForId] = useState<string | null>(null);

  const refresh = () => {
    setProfiles(getStyleProfiles());
    setActiveId(getActiveProfileId());
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = `style_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    saveStyleProfile({
      id,
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      toneKeywords: newTone.trim() ? newTone.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
      examples: [],
    });
    setNewName('');
    setNewDesc('');
    setNewTone('');
    setShowNew(false);
    refresh();
    setExpandedId(id);
  };

  const handleUse = (id: string) => {
    setActiveProfileId(id);
    setActiveId(id);
  };

  const handleDelete = (id: string) => {
    deleteStyleProfile(id);
    if (activeId === id) setActiveId('');
    refresh();
    setExpandedId(null);
  };

  const handleAddExample = (profileId: string) => {
    if (!exampleInput.trim() || !exampleOutput.trim()) return;
    addExampleToProfile(profileId, { input: exampleInput.trim(), output: exampleOutput.trim() });
    setExampleInput('');
    setExampleOutput('');
    setAddingForId(null);
    refresh();
  };

  return (
    <section
      className="border border-glass-border rounded-lg bg-cyber-dark/50 p-4 space-y-4"
      aria-labelledby="style-heading"
    >
      <h2 id="style-heading" className="text-sm font-bold uppercase tracking-tight text-gray-200 flex items-center gap-2">
        <span aria-hidden="true">🎓</span> {t.ui.styleTitle}
      </h2>
      <p className="text-[10px] text-gray-500">{t.ui.styleDescription}</p>

      {profiles.length === 0 && !showNew && (
        <p className="text-xs text-gray-500">{t.ui.styleNoProfiles}</p>
      )}

      {showNew && (
        <div className="p-3 bg-cyber-black/50 border border-glass-border rounded space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.ui.styleProfileNamePlaceholder}
            className="w-full bg-cyber-dark border border-glass-border text-gray-200 text-sm p-2 rounded focus:border-cyber-primary focus-visible:ring-2 focus-visible:ring-cyber-primary/50"
            aria-label={t.ui.styleProfileName}
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder={t.ui.styleProfileName}
            className="w-full bg-cyber-dark border border-glass-border text-gray-400 text-xs p-2 rounded"
            aria-label="Description"
          />
          <input
            type="text"
            value={newTone}
            onChange={(e) => setNewTone(e.target.value)}
            placeholder={t.ui.styleTonePlaceholder}
            className="w-full bg-cyber-dark border border-glass-border text-gray-400 text-xs p-2 rounded"
            aria-label={t.ui.styleToneKeywords}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="text-xs font-mono text-cyber-primary border border-cyber-primary/40 px-2 py-1 rounded hover:bg-cyber-primary/10"
            >
              {t.ui.styleNewProfile}
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="text-xs font-mono text-gray-500 border border-glass-border px-2 py-1 rounded"
            >
              {t.ui.cancelBtn}
            </button>
          </div>
        </div>
      )}

      {!showNew && (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="text-[10px] font-mono text-cyber-accent border border-cyber-accent/40 px-2 py-1 rounded hover:bg-cyber-accent/10"
        >
          + {t.ui.styleNewProfile}
        </button>
      )}

      <ul className="space-y-2">
        {profiles.map((p) => (
          <li key={p.id} className="border border-glass-border rounded p-2 bg-cyber-black/30">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-200">{p.name}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleUse(p.id)}
                  className={`text-[10px] font-mono px-2 py-1 rounded border ${activeId === p.id ? 'bg-cyber-success/20 border-cyber-success text-cyber-success' : 'border-cyber-primary/40 text-cyber-primary hover:bg-cyber-primary/10'}`}
                >
                  {activeId === p.id ? t.ui.styleActive : t.ui.styleUseProfile}
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  className="text-[10px] font-mono text-gray-400 border border-glass-border px-2 py-1 rounded"
                >
                  {expandedId === p.id ? '−' : '+'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="text-[10px] font-mono text-red-400 border border-red-500/40 px-2 py-1 rounded hover:bg-red-500/10"
                  aria-label={t.ui.styleDelete}
                >
                  {t.ui.styleDelete}
                </button>
              </div>
            </div>
            {expandedId === p.id && (
              <div className="mt-3 pt-3 border-t border-glass-border space-y-3">
                {p.examples.length > 0 && (
                  <div className="text-[10px] text-gray-500">
                    {p.examples.length} {t.ui.styleAddExample.toLowerCase()}
                  </div>
                )}
                {addingForId === p.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={exampleInput}
                      onChange={(e) => setExampleInput(e.target.value)}
                      placeholder={t.ui.styleExampleInput}
                      className="w-full bg-cyber-dark border border-glass-border text-gray-300 text-xs p-2 rounded resize-none h-16"
                      rows={2}
                    />
                    <textarea
                      value={exampleOutput}
                      onChange={(e) => setExampleOutput(e.target.value)}
                      placeholder={t.ui.styleExampleOutput}
                      className="w-full bg-cyber-dark border border-glass-border text-gray-300 text-xs p-2 rounded resize-none h-20"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddExample(p.id)}
                        className="text-xs font-mono text-cyber-success border border-cyber-success/40 px-2 py-1 rounded"
                      >
                        {t.ui.styleAddExample}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingForId(null); setExampleInput(''); setExampleOutput(''); }}
                        className="text-xs font-mono text-gray-500 border border-glass-border px-2 py-1 rounded"
                      >
                        {t.ui.cancelBtn}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingForId(p.id)}
                    className="text-[10px] font-mono text-cyber-primary border border-cyber-primary/40 px-2 py-1 rounded"
                  >
                    + {t.ui.styleAddExample}
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default StyleProfileManager;
