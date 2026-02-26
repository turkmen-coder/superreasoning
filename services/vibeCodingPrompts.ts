// Vibe Coding Master - Prompt Templates & System Instructions
// AI-powered project planning & task generation for vibe coding workflows

import type { ProjectScale, ProjectPhase, VibeCodingTask } from '../types/optimizer';

type Language = 'tr' | 'en';

// === System Instructions ===

export function getVibeCodingSystemPrompt(lang: Language): string {
  if (lang === 'tr') {
    return `[SYSTEM -- Vibe Kodlama Ustasi v1.0]

Rol: Vibe Kodlama Ustasi olarak gorev alin. Yapay zeka kodlama araclarinda uzmansiniz ve tum populer gelistirme cercevelerini kapsamli bir sekilde anliyorsunuz. Goreviniz, vibe kodlama tekniklerini kullanarak ticari duzeyde uygulamalari verimli bir sekilde olusturmak icin becerilerinizi kullanmaktir.

Yetkinlikler:
- Cesitli LLM ozelliklerinin sinirlarini kavrayin ve vibe kodlama istemlerini buna gore ayarlayin
- Proje ozelliklerine gore uygun teknik cerceveleri yapilandirin
- Ust duzey programlama becerilerinizi ve tum gelistirme modelleri ve mimarileri hakkindaki bilginizi kullanin
- Kodlamadan musteri arayuzune, gereksinimlerin urun gereksinim belgelerine (PRD) donusturulmesinden birinci sinif kullanici arayuzu (UI) ve testlerin sunulmasina kadar gelistirmenin tum asamalarinda yer alin

Tuzuk:
- Hicbir kosulda karakter ayarlarini bozmayin
- Gercekleri uydurmayın veya yanilsamalar yaratmayin
- Her gorev icin uygulanabilir, kopyalanip yapistirilabilir agent promptlari uret
- Gorevleri mantiksal faz sirasina gore organeze et

Cikti Formati (SADECE bu JSON):
{
  "projectName": "string",
  "prd": "string (Markdown formatinda detayli PRD)",
  "techStack": {
    "frontend": "string",
    "backend": "string",
    "database": "string",
    "deployment": "string"
  },
  "phases": [
    {
      "phase": "requirements|architecture|implementation|testing|deployment",
      "description": "string",
      "tasks": [
        {
          "id": "string (ornek: T-001)",
          "title": "string",
          "description": "string",
          "phase": "requirements|architecture|implementation|testing|deployment",
          "priority": "critical|high|medium|low",
          "estimatedComplexity": "trivial|simple|moderate|complex|epic",
          "dependencies": ["string (baska gorev ID'leri)"],
          "agentPrompt": "string (AI kodlama aracina verilecek detayli istem)"
        }
      ]
    }
  ]
}`;
  }

  return `[SYSTEM -- Vibe Coding Master v1.0]

Role: Act as a Vibe Coding Master. You are an expert in AI coding tools and have a comprehensive understanding of all popular development frameworks. Your task is to use your skills to efficiently build commercial-grade applications using vibe coding techniques.

Competencies:
- Understand the limitations of various LLM capabilities and adjust vibe coding prompts accordingly
- Configure appropriate technical frameworks based on project specifications
- Use your high-level programming skills and knowledge of all development patterns and architectures
- Be involved in all stages of development, from coding to client interface, from converting requirements to product requirement documents (PRD) to delivering first-class UI and tests

Rules:
- Never break character settings under any circumstances
- Do not fabricate facts or create hallucinations
- Generate actionable, copy-pasteable agent prompts for each task
- Organize tasks in logical phase order

Output Format (JSON ONLY):
{
  "projectName": "string",
  "prd": "string (detailed PRD in Markdown format)",
  "techStack": {
    "frontend": "string",
    "backend": "string",
    "database": "string",
    "deployment": "string"
  },
  "phases": [
    {
      "phase": "requirements|architecture|implementation|testing|deployment",
      "description": "string",
      "tasks": [
        {
          "id": "string (e.g. T-001)",
          "title": "string",
          "description": "string",
          "phase": "requirements|architecture|implementation|testing|deployment",
          "priority": "critical|high|medium|low",
          "estimatedComplexity": "trivial|simple|moderate|complex|epic",
          "dependencies": ["string (other task IDs)"],
          "agentPrompt": "string (detailed prompt to give to an AI coding agent)"
        }
      ]
    }
  ]
}`;
}

// === User Prompt Builders ===

export function buildPlanGenerationPrompt(
  projectDescription: string,
  scale: ProjectScale,
  techPreferences: { frontend?: string; backend?: string; database?: string; deployment?: string },
  lang: Language
): string {
  const scaleLabels: Record<ProjectScale, { tr: string; en: string }> = {
    mvp: { tr: 'MVP / Prototip', en: 'MVP / Prototype' },
    startup: { tr: 'Startup Urunu', en: 'Startup Product' },
    enterprise: { tr: 'Kurumsal Uygulama', en: 'Enterprise Application' },
  };

  const techBlock = Object.entries(techPreferences)
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  if (lang === 'tr') {
    return `Asagidaki proje icin kapsamli bir Vibe Kodlama Plani olustur.

Proje Aciklamasi:
${projectDescription}

Olcek: ${scaleLabels[scale].tr}
${techBlock ? `\nTercih Edilen Teknolojiler:\n${techBlock}` : ''}

Gereksinimler:
1. Detayli bir PRD (Urun Gereksinim Belgesi) olustur
2. Projeyi mantiksal fazlara bol (gereksinimler, mimari, implementasyon, test, deploy)
3. Her faz icin gorevler tanimla
4. Her gorev icin bir AI kodlama aracina (Cursor, Claude, Copilot vb.) verilebilecek detayli ve uygulanabilir bir agent istemi (agentPrompt) yaz
5. Gorevler arasi bagimliliklari belirt
6. Oncelik ve karmasiklik seviyelerini dogru ata

SADECE JSON cikti ver, aciklama ekleme.`;
  }

  return `Create a comprehensive Vibe Coding Plan for the following project.

Project Description:
${projectDescription}

Scale: ${scaleLabels[scale].en}
${techBlock ? `\nPreferred Technologies:\n${techBlock}` : ''}

Requirements:
1. Generate a detailed PRD (Product Requirements Document)
2. Break the project into logical phases (requirements, architecture, implementation, testing, deployment)
3. Define tasks for each phase
4. For each task, write a detailed and actionable agent prompt (agentPrompt) that can be given to an AI coding tool (Cursor, Claude, Copilot, etc.)
5. Specify inter-task dependencies
6. Correctly assign priority and complexity levels

Output JSON ONLY, no commentary.`;
}

// === Agent Mode Prompts ===

export function buildAgentTaskPrompt(
  task: VibeCodingTask,
  projectContext: string,
  techStack: { frontend?: string; backend?: string; database?: string },
  lang: Language
): string {
  const techLine = Object.entries(techStack)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');

  if (lang === 'tr') {
    return `[VIBE KODLAMA AGENT GOREVI]

Proje Baglamı:
${projectContext}

Teknoloji Stack: ${techLine || 'Belirtilmedi'}

Gorev: ${task.title}
Aciklama: ${task.description}
Oncelik: ${task.priority}
Karmasiklik: ${task.estimatedComplexity}

Agent Istemi:
${task.agentPrompt}

Talimatlar:
1. Yukaridaki agent istemini kullanarak gorevi tamamla
2. Uretim kalitesinde, kopyalanip yapistirilabilir kod yaz
3. Dosya adlarini ve dizin yapisini belirt
4. Hata yonetimi ve edge case'leri dusun
5. Gerekli bagimliliklari listele

SADECE JSON cikti ver:
{
  "files": [
    {
      "filename": "string (dosya yolu)",
      "language": "string (programlama dili)",
      "code": "string (tam kod)",
      "description": "string (dosya aciklamasi)"
    }
  ],
  "dependencies": ["string"],
  "setupCommands": ["string"],
  "notes": "string"
}`;
  }

  return `[VIBE CODING AGENT TASK]

Project Context:
${projectContext}

Tech Stack: ${techLine || 'Not specified'}

Task: ${task.title}
Description: ${task.description}
Priority: ${task.priority}
Complexity: ${task.estimatedComplexity}

Agent Prompt:
${task.agentPrompt}

Instructions:
1. Complete the task using the agent prompt above
2. Write production-quality, copy-pasteable code
3. Specify file names and directory structure
4. Consider error handling and edge cases
5. List required dependencies

Output JSON ONLY:
{
  "files": [
    {
      "filename": "string (file path)",
      "language": "string (programming language)",
      "code": "string (full code)",
      "description": "string (file description)"
    }
  ],
  "dependencies": ["string"],
  "setupCommands": ["string"],
  "notes": "string"
}`;
}

// === Phase Labels ===

export const PHASE_LABELS: Record<ProjectPhase, { tr: string; en: string; icon: string; color: string }> = {
  requirements: { tr: 'Gereksinimler', en: 'Requirements', icon: '📋', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  architecture: { tr: 'Mimari', en: 'Architecture', icon: '🏗️', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  implementation: { tr: 'Implementasyon', en: 'Implementation', icon: '⚡', color: 'text-cyber-primary bg-cyber-primary/10 border-cyber-primary/30' },
  testing: { tr: 'Test', en: 'Testing', icon: '🧪', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  deployment: { tr: 'Deploy', en: 'Deployment', icon: '🚀', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
};

export const SCALE_OPTIONS: { id: ProjectScale; tr: string; en: string; desc_tr: string; desc_en: string }[] = [
  { id: 'mvp', tr: 'MVP', en: 'MVP', desc_tr: 'Hizli prototip, temel ozellikler', desc_en: 'Quick prototype, core features' },
  { id: 'startup', tr: 'Startup', en: 'Startup', desc_tr: 'Olceklenebilir urun, kullanici yonetimi', desc_en: 'Scalable product, user management' },
  { id: 'enterprise', tr: 'Kurumsal', en: 'Enterprise', desc_tr: 'Tam olcekli, guvenlik, CI/CD', desc_en: 'Full-scale, security, CI/CD' },
];

export const COMPLEXITY_COLORS: Record<string, string> = {
  trivial: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  simple: 'text-green-400 bg-green-500/10 border-green-500/30',
  moderate: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  complex: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  epic: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};
