
import { GoogleGenAI } from "@google/genai";
import { ModelConfig, KnowledgeItem } from "../../types";

// 全局知识库缓存（模拟向量数据库）
let globalKnowledgeBase: KnowledgeItem[] = [];

export const updateKnowledgeBase = (items: KnowledgeItem[]) => {
  globalKnowledgeBase = items;
};

/**
 * 简易检索器：根据关键词检索最相关的文档片段
 */
const searchRelatedKnowledge = (query: string): string => {
  const vectorizedDocs = globalKnowledgeBase.filter(d => d.status === 'vectorized' && d.content);
  if (vectorizedDocs.length === 0) return "";

  // 模拟检索：寻找包含关键词的文档内容
  // 在真实环境中，这里会调用 Embedding 模型计算向量余弦相似度
  const relatedChunks = vectorizedDocs
    .filter(doc => {
      const keywords = query.toLowerCase().split(/\s+/);
      return keywords.some(k => doc.content?.toLowerCase().includes(k) || doc.name.toLowerCase().includes(k));
    })
    .map(doc => `--- 来自文档: ${doc.name} ---\n${doc.content}\n`)
    .join("\n");

  return relatedChunks ? `\n【参考本地知识库信息】：\n${relatedChunks}` : "";
};

export const AI_CONFIG = {
  ACTIVE_PLAN: 'GEMINI',
  GEMINI_MODELS: {
    /*DIAGNOSIS: 'gemini-3-flash-preview',
    ANALYSIS: 'gemini-3-pro-preview'*/
    DIAGNOSIS: 'deepseek-r3',
    ANALYSIS: 'deepseek-r3'
  },
  OLLAMA_CONFIG: {
    MODEL: 'deepseek-r3',
    URL: 'http://localhost:11434/api/generate'
  }
};

export const getAIResponse = async (
  prompt: string, 
  systemInstruction: string, 
  config: ModelConfig,
  modelName: string = AI_CONFIG.GEMINI_MODELS.DIAGNOSIS,
  onChunk?: (chunk: string) => void
) => {
  
  // 1. 执行 RAG：搜索相关背景知识
  const knowledgeContext = searchRelatedKnowledge(prompt);
  const enhancedSystemInstruction = systemInstruction + (knowledgeContext 
    ? `\n\n请务必参考以下我为你检索到的本地知识库内容来回答用户问题。如果知识库内容与问题相关，请优先使用知识库中的规范：${knowledgeContext}`
    : "\n\n当前本地知识库中未检索到直接相关的参考文档。");

  // 2. 调用模型
  if (AI_CONFIG.ACTIVE_PLAN === 'GEMINI') {
    if (!process.env.API_KEY) {
      throw new Error("未检测到 API_KEY 环境变量。如果您在本地运行，请确保使用 'export API_KEY=您的密钥' (Mac/Linux) 或 'set API_KEY=您的密钥' (Windows) 启动应用。");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      if (onChunk) {
        const result = await ai.models.generateContentStream({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: enhancedSystemInstruction,
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens,
          },
        });

        let fullText = "";
        for await (const chunk of result) {
          const text = chunk.text;
          if (text) {
            fullText += text;
            onChunk(text);
          }
        }
        return fullText;
      } else {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: enhancedSystemInstruction,
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens,
          },
        });
        return result.text;
      }
    } catch (error: any) {
      // 增强错误信息，如果是 404 或 400，可能是模型名称不对或 key 无效
      if (error.message?.includes('404')) {
        throw new Error(`模型 ${modelName} 未找到或不可用 (404)。请检查 API Key 权限或更换模型。`);
      }
      throw error;
    }
  }

  if (AI_CONFIG.ACTIVE_PLAN === 'OLLAMA') {
    const response = await fetch(AI_CONFIG.OLLAMA_CONFIG.URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_CONFIG.OLLAMA_CONFIG.MODEL,
        prompt: `System: ${enhancedSystemInstruction}\n\nUser: ${prompt}`,
        stream: !!onChunk,
        options: { temperature: config.temperature }
      })
    });

    if (onChunk) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.response) {
              fullText += json.response;
              onChunk(json.response);
            }
          } catch (e) {}
        }
      }
      return fullText;
    } else {
      const data = await response.json();
      return data.response;
    }
  }
};
