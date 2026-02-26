export enum Framework {
  AUTO = 'AUTO',
  KERNEL = 'KERNEL',
  COSTAR = 'CO_STAR',
  RISEN = 'RISEN',
  RTF = 'RTF',
  BAB = 'BAB',
  TAG = 'TAG',
  CARE = 'CARE',
  REACT = 'REACT',
  CHAIN = 'CHAIN_OF_THOUGHT',
  TREE = 'TREE_OF_THOUGHT',
  REWOO = 'REWOO',
  DSP = 'DSP',
  SELFREFINE = 'SELF_REFINE',
  CRITIC = 'CRITIC_REVISE',
  SCENARIO = 'SCENARIO_PLANNING',
  OODA = 'OODA_LOOP',
  REDTEAM = 'RED_TEAM',
  SOCRATIC = 'SOCRATIC',
  SWOT = 'SWOT',
  FIVEWHYS = 'FIVE_WHYS',
  MECE = 'MECE',
  SCAMPER = 'SCAMPER',
  PDCA = 'PDCA',
  STAR = 'STAR',
  SMART = 'SMART',
  DIALECTIC = 'DIALECTIC',
  STEPBACK = 'STEP_BACK',
  ANALOGICAL = 'ANALOGICAL',
  MORPHOLOGICAL = 'MORPHOLOGICAL',
  DELPHI = 'DELPHI',
  SIX_HATS = 'SIX_HATS',
  TRIZ = 'TRIZ',
  PESTEL = 'PESTEL',
  PORTER = 'PORTER',
  LEAN = 'LEAN',
  AGILE = 'AGILE',
  FIRST_PRINCIPLES = 'FIRST_PRINCIPLES',
  INVERSION = 'INVERSION',
  FUTURES_WHEEL = 'FUTURES_WHEEL',
  BACKCASTING = 'BACKCASTING',
  KANO = 'KANO',
  JTBD = 'JOBS_TO_BE_DONE',
  DESIGN_THINKING = 'DESIGN_THINKING',
  SYSTEMS_THINKING = 'SYSTEMS_THINKING',
  GAME_THEORY = 'GAME_THEORY',
  BAYESIAN = 'BAYESIAN',
  META_PROMPT = 'META_PROMPT',
  LATERAL = 'LATERAL',
  CATWOE = 'CATWOE',
  DECISION_MATRIX = 'DECISION_MATRIX',
  MIND_MAP = 'MIND_MAP',
  RAPID = 'RAPID',
  MOSCOW = 'MOSCOW',
  OKR = 'OKR',
  HYPOTHESIS = 'HYPOTHESIS',
  PREMORTEM = 'PREMORTEM'
}

export interface PromptRequest {
  intent: string;
  framework: Framework;
  domainId: string;
  useSearch: boolean;
  language: 'tr' | 'en';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface PromptResponse {
  masterPrompt: string;
  reasoning: string;
  detectedFramework?: Framework;
  detectedDomain?: string;
  groundingSources?: GroundingSource[];
  /** 0-100: Kaynak doğruluk puanı (grounding kullanımı + kaynak sayısı) */
  groundingScore?: number;
  /** Post-generation enrichment result (when enrichment mode is enabled) */
  enrichment?: import('../types/enrichment').EnrichmentResult;
}

export interface FrameworkDetails {
  id: Framework;
  name: string;
  description: string;
  focus: string;
  icon: string;
  color: string;
}

export interface DomainDetails {
  id: string;
  name: string;
  icon: string;
  description: string;
  contextRules: string;
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 string without header
  /** Metin: ilk N karakter; görsel: data URL (thumbnail); PDF/ZIP: yok */
  preview?: string;
}

export type Language = 'tr' | 'en';

/** Multi-step Agent Orchestration: adım türleri */
export type WorkflowStepType = 'research' | 'summarize' | 'generate_prompt' | 'test';

export interface WorkflowStepResult {
  step: WorkflowStepType;
  label: string;
  output: string;
  promptResponse?: PromptResponse;
  testPass?: boolean;
  testDetail?: string;
}

export interface WorkflowRunResult {
  stepResults: WorkflowStepResult[];
  finalPrompt: PromptResponse | null;
  error?: string;
}

/** Interactive Teaching Mode: kullanıcının örneklerle öğrettiği üslup profili */
export interface StyleExample {
  input: string;
  output: string;
}

export interface StyleProfile {
  id: string;
  name: string;
  description?: string;
  examples: StyleExample[];
  toneKeywords?: string[];
  createdAt: string;
}
