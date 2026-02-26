import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const hfToken = env.HUGGING_FACE_HUB_TOKEN || env.VITE_HUGGING_FACE_HUB_TOKEN;
    const anthropicKey = env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY;
    const proxy: Record<string, any> = {};
    if (hfToken) {
      proxy['/api/hf'] = {
        target: 'https://router.huggingface.co',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/hf/, ''),
        configure: (proxyServer: any) => {
          proxyServer.on('proxyReq', (proxyReq: any) => {
            proxyReq.setHeader('Authorization', `Bearer ${hfToken}`);
          });
        },
      };
    }
    if (anthropicKey) {
      proxy['/api/claude'] = {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/claude/, ''),
        configure: (proxyServer: any) => {
          proxyServer.on('proxyReq', (proxyReq: any) => {
            proxyReq.setHeader('x-api-key', anthropicKey);
            proxyReq.setHeader('anthropic-version', '2023-06-01');
          });
        },
      };
    }
    proxy['/api/v1'] = {
      target: process.env.VITE_API_URL || 'http://localhost:4000',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    };
    proxy['/v1'] = {
      target: process.env.VITE_API_URL || 'http://localhost:4000',
      changeOrigin: true,
    };
    return {
      server: {
        port: 3000,
        strictPort: false,
        host: '0.0.0.0',
        proxy: Object.keys(proxy).length ? proxy : undefined,
      },
      preview: {
        host: '0.0.0.0',
        port: 3100,
        allowedHosts: ['srv1327766.hstgr.cloud', 'localhost', '127.0.0.1'],
        proxy: {
          '/api/v1': {
            target: process.env.VITE_API_URL || 'http://localhost:4100',
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api/, ''),
          },
          '/v1': {
            target: process.env.VITE_API_URL || 'http://localhost:4100',
            changeOrigin: true,
          },
        },
      },
      plugins: [
        react({
          babel: {
            plugins: [
              ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'es2022',
        minify: 'esbuild',
        cssMinify: true,
        sourcemap: false,
        rollupOptions: {
          onwarn: (_warning, _warn) => {
            // Tüm hataları görmezden gel
            return;
          },
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'ai-services': [
                './services/geminiService',
                './services/claudeService',
                './services/groqService',
                './services/huggingFaceService',
                './services/openRouterService',
                './services/deepseekService',
                './services/openaiService',
                './services/vibeCodingService',
                './services/vibeCodingPrompts'
              ],
              'ui-components': [
                './components/ResultDisplay',
                './components/OutputTerminal',
                './components/AILabWorkbench',
                './components/VibeCodingPanel',
                './components/EnrichmentPanel'
              ],
              'quality-tools': [
                './services/judgeEnsemble',
                './services/promptLint',
                './services/budgetOptimizer'
              ]
            }
          }
        },
        chunkSizeWarningLimit: 1000
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-markdown'],
        exclude: []
      },
      test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts', '**/*.test.ts'],
        exclude: ['**/._*', '**/node_modules/**'],
      },
    };
});
