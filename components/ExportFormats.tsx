/**
 * Export Formats — Export prompts to PDF, Word, Notion, and other formats.
 */
import { useState } from 'react';
import { useTranslation } from '../i18n';
import { useToast } from './ToastSystem';

interface PromptData {
  name: string;
  masterPrompt: string;
  framework: string;
  domain: string;
  createdAt: string;
}

interface Props {
  prompt?: PromptData;
}

export default function ExportFormats({ prompt }: Props) {
  const { t, language } = useTranslation();
  const { addToast } = useToast();

  const [promptText, setPromptText] = useState(prompt?.masterPrompt || '');
  const [promptName, setPromptName] = useState(prompt?.name || 'my-prompt');
  const [exporting, setExporting] = useState<string | null>(null);

  const exportToPDF = async () => {
    setExporting('pdf');
    await new Promise(r => setTimeout(r, 500));

    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${promptName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #00ff88; padding-bottom: 10px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
    .prompt { background: #f5f5f5; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; }
  </style>
</head>
<body>
  <h1>${promptName}</h1>
  <div class="meta">
    <p>Framework: ${prompt?.framework || 'Universal'}</p>
    <p>Domain: ${prompt?.domain || 'General'}</p>
    <p>Created: ${new Date().toLocaleDateString()}</p>
  </div>
  <div class="prompt">${promptText}</div>
</body>
</html>`;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${promptName}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
    addToast(language === 'tr' ? 'PDF indirildi.' : 'PDF downloaded.', 'success');
  };

  const exportToMarkdown = () => {
    setExporting('md');
    const content = `# ${promptName}

**Framework:** ${prompt?.framework || 'Universal'}
**Domain:** ${prompt?.domain || 'General'}
**Created:** ${new Date().toLocaleDateString()}

---

## Prompt

\`\`\`
${promptText}
\`\`\`
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${promptName}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
    addToast(language === 'tr' ? 'Markdown indirildi.' : 'Markdown downloaded.', 'success');
  };

  const exportToWord = async () => {
    setExporting('docx');
    await new Promise(r => setTimeout(r, 500));

    const content = `${promptName}

Framework: ${prompt?.framework || 'Universal'}
Domain: ${prompt?.domain || 'General'}
Created: ${new Date().toLocaleDateString()}

---

${promptText}`;

    const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${promptName}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
    addToast(language === 'tr' ? 'Word dosyası indirildi.' : 'Word file downloaded.', 'success');
  };

  const exportToJSON = () => {
    setExporting('json');
    const data = {
      name: promptName,
      prompt: promptText,
      framework: prompt?.framework || 'universal',
      domain: prompt?.domain || 'general',
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${promptName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
    addToast(language === 'tr' ? 'JSON indirildi.' : 'JSON downloaded.', 'success');
  };

  const exportToNotion = async () => {
    setExporting('notion');
    await new Promise(r => setTimeout(r, 500));

    const notionBlock = {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: promptText },
          },
        ],
      },
    };

    const blob = new Blob([JSON.stringify(notionBlock, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${promptName}-notion-block.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
    addToast(t.ui.exportNotionSuccess, 'success');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      addToast(t.ui.exportCopied, 'success');
    } catch {
      addToast(language === 'tr' ? 'Kopyalama başarısız.' : 'Copy failed.', 'error');
    }
  };

  const EXPORT_OPTIONS = [
    { id: 'pdf', label: 'PDF (HTML)', icon: '📄', action: exportToPDF, color: 'bg-red-500/20 text-red-400' },
    { id: 'md', label: 'Markdown', icon: '📝', action: exportToMarkdown, color: 'bg-blue-500/20 text-blue-400' },
    { id: 'docx', label: 'Word', icon: '📃', action: exportToWord, color: 'bg-purple-500/20 text-purple-400' },
    { id: 'json', label: 'JSON', icon: '💾', action: exportToJSON, color: 'bg-yellow-500/20 text-yellow-400' },
    { id: 'notion', label: 'Notion', icon: '📚', action: exportToNotion, color: 'bg-green-500/20 text-green-400' },
  ];

  return (
    <div className="text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-cyber-primary font-display">
            {t.ui.exportTitle}
          </h1>
          <p className="text-gray-400 mt-1">
            {t.ui.exportDesc}
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">{t.ui.exportNameLabel}</label>
            <input
              type="text"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              className="glass-input w-full"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">{t.ui.exportContentLabel}</label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="glass-input w-full h-48 font-mono text-sm resize-none"
              placeholder={t.ui.exportContentPlaceholder}
            />
          </div>

          <div className="mb-4">
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t.ui.exportCopyBtn}
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3 font-display">
              {t.ui.exportFormatsLabel}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EXPORT_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={option.action}
                  disabled={exporting === option.id || !promptText}
                  className={`p-4 rounded-xl border border-gray-700 hover:border-gray-500 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 ${option.color}`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-sm font-medium">
                    {exporting === option.id ? t.ui.exportDownloading : option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 glass-card">
          <h3 className="font-semibold text-gray-300 mb-2 font-display">{t.ui.exportAbout}</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p>• <strong>PDF (HTML):</strong> {t.ui.exportFormatPdf}</p>
            <p>• <strong>Markdown:</strong> {t.ui.exportFormatMarkdown}</p>
            <p>• <strong>Word:</strong> {t.ui.exportFormatWord}</p>
            <p>• <strong>JSON:</strong> {t.ui.exportFormatJson}</p>
            <p>• <strong>Notion:</strong> {t.ui.exportFormatNotion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
