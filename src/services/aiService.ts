
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

// 2. 修改搜索函数
// 注意：真实项目中，前端不应该做 Embedding 计算，因为模型太大了。
// 但为了演示，我们这里用简单的“关键词匹配”+“预计算向量”的混合模拟，
// ⭐️ 演示最快方案：依然用关键词匹配，但数据源来自我们刚才生成的 knowledge_index.json
export const searchRelatedKnowledge = async (query: string): Promise<string> => {
  try {
    // 读取我们刚才 Python 生成的文件
    const response = await fetch('/knowledge_index.json');
    if (!response.ok) return "";

    const knowledgeBase = await response.json();

    // 简单模拟 RAG：找到包含关键词的切片 (比向量轻量，演示效果足够)
    // 如果您想做真向量检索，需要在前端引入 transformers.js 来把 query 变成向量，然后和 knowledgeBase 里的 vector 对比
    const keywords = query.toLowerCase().split(/\s+/);

    const relevantDocs = knowledgeBase.filter((doc: any) => {
      return keywords.some(k => doc.content.toLowerCase().includes(k));
    });

    if (relevantDocs.length === 0) return "";

    // 取前 3 个相关片段
    const context = relevantDocs.slice(0, 3).map((d: any) => d.content).join("\n\n");
    return `\n【RAG 知识库检索结果】：\n${context}\n`;

  } catch (e) {
    console.error("读取知识库失败", e);
    return "";
  }
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

// 1. 引入计算余弦相似度的简单算法
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
