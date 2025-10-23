import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface AvatarPromptConfig {
  name: string;
  avatar_id: string;
  opening_line?: string;
  voice?: {
    emotion?: string;
    rate?: number;
  };
  system_prompt: string;
  knowledge_base_id?: string; // Optional: use if you have KB permissions
}

export interface EvaluationRubricConfig {
  name: string;
  prompt: string;
}

export interface PromptsConfig {
  [key: string]: AvatarPromptConfig | EvaluationRubricConfig;
}

let cachedConfig: PromptsConfig | null = null;

export function loadPromptsConfig(): PromptsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = path.join(process.cwd(), 'config', 'prompts.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    cachedConfig = yaml.load(fileContents) as PromptsConfig;
    return cachedConfig;
  } catch (error) {
    console.error('Failed to load prompts configuration:', error);
    return {};
  }
}

export function getPromptConfig(promptId: string): AvatarPromptConfig | null {
  const config = loadPromptsConfig();
  const promptConfig = config[promptId];

  // Type guard: ensure it's an AvatarPromptConfig, not EvaluationRubricConfig
  if (promptConfig && 'avatar_id' in promptConfig && 'system_prompt' in promptConfig) {
    return promptConfig as AvatarPromptConfig;
  }

  return null;
}

export function getAllPromptIds(): string[] {
  const config = loadPromptsConfig();
  return Object.keys(config);
}

export function getEvaluationRubric(): string {
  const config = loadPromptsConfig();
  const rubricConfig = config['evaluation_rubric'] as EvaluationRubricConfig;
  return rubricConfig?.prompt || '';
}
