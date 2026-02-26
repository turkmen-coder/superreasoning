import * as vscode from 'vscode';
import axios from 'axios';

interface SuperReasoningConfig {
  apiUrl: string;
  apiKey: string;
  defaultFramework: string;
  defaultProvider: string;
  enableRealTimeCollaboration: boolean;
  showInlinePreview: boolean;
}

interface GenerationRequest {
  intent: string;
  framework?: string;
  provider?: string;
  language?: string;
}

interface GenerationResponse {
  masterPrompt: string;
  reasoning: string;
  framework: string;
  provider: string;
  language: string;
  metadata?: any;
}

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    'superReasoning.status',
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'superReasoning.openDashboard';
  statusBarItem.text = '$(rocket) Super Reasoning';
  statusBarItem.tooltip = 'Open Super Reasoning Dashboard';
  context.subscriptions.push(statusBarItem);

  // Get configuration
  const config = vscode.workspace.getConfiguration('superReasoning') as SuperReasoningConfig;

  // Register commands
  const generatePromptCommand = vscode.commands.registerCommand(
    'superReasoning.generatePrompt',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active text editor found');
        return;
      }

      const selection = editor.selection;
      const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);

      if (!text.trim()) {
        vscode.window.showErrorMessage('No text selected');
        return;
      }

      await generatePrompt(text, config);
    }
  );

  const openDashboardCommand = vscode.commands.registerCommand(
    'superReasoning.openDashboard',
    () => {
      const panel = vscode.window.createWebviewPanel(
        'superReasoning.dashboard',
        'Super Reasoning Dashboard',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      panel.webview.html = getDashboardHtml(panel.webview);
      
      panel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case 'generatePrompt':
              await generatePrompt(message.text, config);
              break;
            case 'generateFromSelection':
              await generateFromSelection(config);
              break;
            case 'updateConfig':
              await updateConfiguration(message.config);
              break;
          }
        }
      );
    }
  );

  const openCollaborationCommand = vscode.commands.registerCommand(
    'superReasoning.openCollaboration',
    () => {
      vscode.env.openExternal(vscode.Uri.parse(`${config.apiUrl}/collaboration`));
    }
  );

  const openAnalyticsCommand = vscode.commands.registerCommand(
    'superReasoning.openAnalytics',
    () => {
      vscode.env.openExternal(vscode.Uri.parse(`${config.apiUrl}/analytics`));
    }
  );

  const openEvolutionCommand = vscode.commands.registerCommand(
    'superReasoning.openEvolution',
    () => {
      vscode.env.openExternal(vscode.Uri.parse(`${config.apiUrl}/evolution`));
    }
  );

  // Register all commands
  context.subscriptions.push(
    generatePromptCommand,
    openDashboardCommand,
    openCollaborationCommand,
    openAnalyticsCommand,
    openEvolutionCommand
  );

  // Register content provider for inline preview
  if (config.showInlinePreview) {
    const provider = new SuperReasoningContentProvider();
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider('superReasoning', provider)
    );
  }

  // Update status bar
  updateStatusBar(config);
}

async function generatePrompt(text: string, config: SuperReasoningConfig) {
  if (!config.apiKey) {
    vscode.window.showErrorMessage('API key not configured. Please set it in settings.');
    return;
  }

  try {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating prompt...',
        cancellable: false
      },
      async (progress) => {
        const request: GenerationRequest = {
          intent: text,
          framework: config.defaultFramework,
          provider: config.defaultProvider,
          language: 'en'
        };

        const response = await axios.post<GenerationResponse>(
          `${config.apiUrl}/v1/generate`,
          request,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.apiKey
            }
          }
        );

        // Show result in new document
        const doc = await vscode.workspace.openTextDocument({
          content: formatPromptResponse(response.data),
          language: 'markdown'
        });

        // Show in notification
        vscode.window.showInformationMessage(
          'Prompt generated successfully!',
          'Open Document',
          'Open'
        ).then(selection => {
          if (selection === 'Open') {
            vscode.window.showTextDocument(doc);
          }
        });

        progress.report({ increment: 100 });
      }
    );
  } catch (error) {
    console.error('Error generating prompt:', error);
    vscode.window.showErrorMessage(`Failed to generate prompt: ${error}`);
  }
}

async function generateFromSelection(config: SuperReasoningConfig) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selection = editor.selection;
  const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
  
  if (text.trim()) {
    await generatePrompt(text, config);
  }
}

async function updateConfiguration(newConfig: Partial<SuperReasoningConfig>) {
  const currentConfig = vscode.workspace.getConfiguration('superReasoning');
  
  for (const [key, value] of Object.entries(newConfig)) {
    await currentConfig.update(key, value);
  }
  
  updateStatusBar({ ...currentConfig, ...newConfig } as SuperReasoningConfig);
}

function updateStatusBar(config: SuperReasoningConfig) {
  if (statusBarItem) {
    statusBarItem.text = config.apiKey 
      ? '$(rocket) Super Reasoning' 
      : '$(warning) Super Reasoning (No API Key)';
    statusBarItem.tooltip = config.apiKey 
      ? 'Super Reasoning - Connected' 
      : 'Super Reasoning - API Key Required';
  }
}

function formatPromptResponse(response: GenerationResponse): string {
  return `# Generated Master Prompt

**Framework:** ${response.framework}
**Provider:** ${response.provider}
**Language:** ${response.language}

## Reasoning
${response.reasoning}

## Master Prompt
\`\`\`
${response.masterPrompt}
\`\`\`

---
*Generated by Super Reasoning*`;
}

function getDashboardHtml(webview: vscode.Webview): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Super Reasoning</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background: #1a1a1a;
            color: #ffffff;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 2.5em;
            margin: 0;
            background: linear-gradient(45deg, #00ff88, #00ccff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
        }
        .prompt-section {
            background: #2a2a2a;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
        }
        .prompt-input {
            width: 100%;
            height: 120px;
            background: #1a1a1a;
            border: 2px solid #00ff88;
            border-radius: 8px;
            color: #ffffff;
            font-size: 14px;
            padding: 15px;
            resize: vertical;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        .controls {
            display: flex;
            gap: 15px;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        .btn {
            background: linear-gradient(45deg, #00ff88, #00ccff);
            color: #000000;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 255, 136, 0.3);
        }
        .btn-secondary {
            background: #333333;
            color: #ffffff;
        }
        .btn-secondary:hover {
            background: #444444;
        }
        .result-section {
            background: #2a2a2a;
            border-radius: 12px;
            padding: 30px;
            margin-top: 20px;
            display: none;
        }
        .result-content {
            background: #1a1a1a;
            border: 1px solid #00ff88;
            border-radius: 8px;
            padding: 20px;
            font-family: 'Monaco', 'Menlo', monospace;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
        }
        .status {
            margin-top: 10px;
            padding: 10px;
            border-radius: 6px;
            text-align: center;
        }
        .status.success {
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
        }
        .status.error {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff0000;
            color: #ff0000;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Super Reasoning</h1>
            <p style="color: #cccccc; margin-top: 10px;">AI-Powered Prompt Engineering Platform</p>
        </div>

        <div class="prompt-section">
            <h2 style="margin-top: 0; color: #00ff88;">Generate Master Prompt</h2>
            <textarea 
                id="promptInput" 
                class="prompt-input" 
                placeholder="Enter your intent here... (e.g., 'Create a REST API for user management')"
            ></textarea>
            
            <div class="controls">
                <button class="btn" onclick="generatePrompt()">
                    🚀 Generate
                </button>
                <button class="btn btn-secondary" onclick="generateFromSelection()">
                    📝 Use Selection
                </button>
                <button class="btn btn-secondary" onclick="clearInput()">
                    🗑️ Clear
                </button>
            </div>
        </div>

        <div id="resultSection" class="result-section">
            <h2 style="margin-top: 0; color: #00ccff;">Generated Result</h2>
            <div id="resultContent" class="result-content"></div>
            <div id="status" class="status"></div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function generatePrompt() {
            const input = document.getElementById('promptInput').value;
            if (!input.trim()) {
                showStatus('Please enter a prompt intent', 'error');
                return;
            }
            
            vscode.postMessage({
                command: 'generatePrompt',
                text: input
            });
            
            showStatus('Generating prompt...', 'info');
        }

        function generateFromSelection() {
            vscode.postMessage({
                command: 'generateFromSelection'
            });
        }

        function clearInput() {
            document.getElementById('promptInput').value = '';
            document.getElementById('resultSection').style.display = 'none';
        }

        function showResult(result) {
            document.getElementById('resultContent').textContent = result;
            document.getElementById('resultSection').style.display = 'block';
            document.getElementById('status').style.display = 'none';
        }

        function showStatus(message, type) {
            const statusEl = document.getElementById('status');
            statusEl.textContent = message;
            statusEl.className = \`status \${type}\`;
            statusEl.style.display = 'block';
            document.getElementById('resultSection').style.display = 'none';
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'result') {
                showResult(message.content);
            } else if (message.type === 'error') {
                showStatus(message.content, 'error');
            } else if (message.type === 'status') {
                showStatus(message.content, 'info');
            }
        });
    </script>
</body>
</html>`;
}

class SuperReasoningContentProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): vscode.ProviderResult<string> {
    if (uri.path.endsWith('.superReasoning')) {
      const text = '<!-- Super Reasoning inline preview -->\\n' +
                   '<!-- Use the Super Reasoning extension to generate prompts -->';
      return { text };
    }
    return undefined;
  }
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
