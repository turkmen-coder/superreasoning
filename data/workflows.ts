import { WorkflowStepType } from '../types';

export interface WorkflowPreset {
  id: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  steps: WorkflowStepType[];
}

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: 'full',
    nameTr: 'Tam zincir',
    nameEn: 'Full pipeline',
    descriptionTr: 'Araştır → Özetle → Prompt üret → Test et',
    descriptionEn: 'Research → Summarize → Generate prompt → Test',
    steps: ['research', 'summarize', 'generate_prompt', 'test'],
  },
  {
    id: 'quick',
    nameTr: 'Hızlı',
    nameEn: 'Quick',
    descriptionTr: 'Prompt üret → Test et',
    descriptionEn: 'Generate prompt → Test',
    steps: ['generate_prompt', 'test'],
  },
  {
    id: 'research_prompt',
    nameTr: 'Araştırma + Prompt',
    nameEn: 'Research + Prompt',
    descriptionTr: 'Araştır (Gemini) → Prompt üret → Test',
    descriptionEn: 'Research (Gemini) → Generate → Test',
    steps: ['research', 'generate_prompt', 'test'],
  },
  {
    id: 'generate_only',
    nameTr: 'Sadece üret',
    nameEn: 'Generate only',
    descriptionTr: 'Tek adım: usta istem üret',
    descriptionEn: 'Single step: generate master prompt',
    steps: ['generate_prompt'],
  },
  {
    id: 'research_summarize',
    nameTr: 'Araştır + Özetle',
    nameEn: 'Research + Summarize',
    descriptionTr: 'Araştır (Gemini) → Özetle',
    descriptionEn: 'Research (Gemini) → Summarize',
    steps: ['research', 'summarize'],
  },
  {
    id: 'deep_research',
    nameTr: 'Derin araştırma',
    nameEn: 'Deep research',
    descriptionTr: 'Araştır → Özetle → Araştır → Prompt üret → Test',
    descriptionEn: 'Research → Summarize → Research → Generate → Test',
    steps: ['research', 'summarize', 'research', 'generate_prompt', 'test'],
  },
  {
    id: 'test_only',
    nameTr: 'Sadece test',
    nameEn: 'Test only',
    descriptionTr: 'Mevcut promptu test et',
    descriptionEn: 'Test existing prompt',
    steps: ['test'],
  },
  {
    id: 'summarize_generate',
    nameTr: 'Özetle + Üret',
    nameEn: 'Summarize + Generate',
    descriptionTr: 'Özetle → Prompt üret → Test',
    descriptionEn: 'Summarize → Generate → Test',
    steps: ['summarize', 'generate_prompt', 'test'],
  },
];
