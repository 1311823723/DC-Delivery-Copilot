
export enum AppTab {
  NEWCOMER = 'newcomer',
  DIAGNOSIS = 'diagnosis',
  ANALYSIS = 'analysis',
  KNOWLEDGE = 'knowledge'
}

export interface ModelConfig {
  temperature: number;
  maxTokens: number;
}

export interface KnowledgeItem {
  id: string;
  name: string;
  size: string;
  date: string;
  status: 'vectorized' | 'processing' | 'error';
  content?: string; // 存储解析后的纯文本
}

export interface DiagnosticStep {
  label: string;
  status: 'pending' | 'running' | 'completed';
}
