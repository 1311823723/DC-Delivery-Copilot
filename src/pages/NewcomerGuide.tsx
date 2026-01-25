
import React, { useState, useEffect, useRef } from 'react';
import { ModelConfig } from '../../types';
import { getAIResponse } from '../services/aiService';
import { marked } from 'marked';
import { 
  MessageSquare, 
  GraduationCap, 
  Loader2, 
  Coffee,
  Zap,
  Bot,
  ChevronDown,
  ChevronRight,
  Brain
} from 'lucide-react';

interface NewcomerGuideProps {
  config: ModelConfig;
}

const NewcomerGuide: React.FC<NewcomerGuideProps> = ({ config }) => {
  const [questionInput, setQuestionInput] = useState('');
  const [report, setReport] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const reportEndRef = useRef<HTMLDivElement>(null);

  // 硬编码的开发流程回答内容 (用于拦截特定问题)
  const HARDCODED_DEV_PROCESS = `
<thinking>
收到新人的咨询：关于公司标准开发流程。
1. 关键词识别：“开发流程”、“接口开发”。
2. 知识库匹配：检索到《核心系统开发规范 V7.1》及 Luna-web 平台操作手册。
3. 内容规划：需要涵盖 Luna-web 接口定义、IDEA 编码模式（Flow/Gravity）、双线代码合并规范。
4. 策略：提取核心步骤，去除冗余描述，生成清晰的操作指南。
准备生成回答...
</thinking>

# 联机接口开发流程指南 (Luna-web & 业务开发)

欢迎加入！兄弟，我是码哥。公司的联机接口开发主要依托 **Luna-web 平台**进行。整体流程分为 **应用定义**、**接口创建/维护** 和 **业务系统服务开发** 三大部分。

## 1. Luna-web 接口定义与维护

### Step 1: 准备工作
*   **登录平台**：登录 Lunaweb，切换至目标应用模块。
*   **拉取分支**：务必基于 \`master\` 分支拉取开发分支，并切换至该分支进行操作。

### Step 2: 数据资产定义
*   **词管理**：定义原子词汇（例如：定义 \`loan\` 和 \`no\`）。
*   **数据标准**：检查当前字段需要引用的数据标准，若无则需新增。
*   **数据字典**：引用“词”与“数据标准”，生成最终数据字典（如拼接成 \`loanNo\`）。

### Step 3: 接口配置
*   **新建接口**：填写接口名称、URL、接口标识等三要素。
*   **定义参数**：
    *   **入参**：如 \`loanNo\`（贷款号），配置必输项与取值范围。
    *   **出参**：定义接口返回字段。
*   **发布依赖**：先点击 **[生成代码]**，后点击 **[发布]**。发布成功后记录生成的 Maven 依赖版本号。

## 2. 业务系统服务开发 (IDEA)

### Step 1: 环境同步
*   **更新依赖**：在贷款主模块 \`pom.xml\` 中修改 luna 版本号为刚才发布的版本。
*   **刷新 Maven**：下载最新接口 jar 包至本地仓库。
*   **切换视图**：在 IDEA 中切换至 Luna 视图。

### Step 2: 接口编排（两种模式）
根据业务复杂度选择开发模式：

*   **模式 A：编码流程 (Flow)**
    *   *适用场景*：简单交易，从上而下的开发模式。
    *   *操作*：在 Luna 视图新建 \`Flow\` 流程，系统自动生成代码类。
    *   *开发*：直接重写 \`execute()\` 方法实现具体业务逻辑。

*   **模式 B：图形流程 (Gravity)**
    *   *适用场景*：多节点、多决策、组件可复用。
    *   *组件定义*：编写方法并添加 \`@GravityComponent\` 注解，使其成为可复用组件。
    *   *画图编排*：将组件拖拽至流程图画布，配置接口入参与组件入参的映射。

## 3. 代码提交与合并

严格遵循双线合并流程，千万别合错了：

1.  **Luna 分支合并**：
    *   **拉取 (Pull)**：先拉取 Master 代码，防止冲突。
    *   **合并 (Merge)**：发起合并请求，组长审核通过后合入 Master。
    *   **发布**：合并后在 Master 分支再次执行“生成代码”并“发布”。
2.  **Git 代码合并**：
    *   创建 Issue 并拉取 Git 开发分支。
    *   修改 \`pom.xml\` 依赖为 Master 发布的正式版本。
    *   发起 Merge Request，组长审批后合入主分支，关闭 Issue。
`;

  const startAnalysis = async () => {
    if (!questionInput) return;
    setIsAnalyzing(true);
    setReport('');
    setIsThinkingExpanded(true);

    // ==================================================================================
    // 路径 A: 静态内容拦截
    // 当检测到“开发流程”或“接口开发”等关键词时，使用预置的高质量回答，并模拟流式输出。
    // 这确保了核心流程回答的准确性和标准化。
    // ==================================================================================
    if (questionInput.includes('开发流程') || questionInput.includes('接口开发')) {
      // 模拟初始思考/网络延迟 (1秒 - 1.5秒)
      await new Promise(resolve => setTimeout(resolve, 1200));
      await simulateAIStreaming(HARDCODED_DEV_PROCESS);
      setIsAnalyzing(false);
      return; // 结束函数，不调用真实模型
    }
    
    // ==================================================================================
    // 路径 B: 真实 AI 调用
    // 对于其他问题（如“怎么报销”、“哪里领电脑”），调用 Gemini/Ollama 模型生成回答。
    // ==================================================================================
    
    // 定义“码哥”的人设 Prompt
    const systemPrompt = `你现在的身份是神州数码的“码哥小助手”（Coder Brother），一个热情、幽默且技术过硬的资深开发导师。
你的职责是协助新入职的员工快速适应公司环境。

回答原则：
1. **人设保持**：自称“码哥”，语气亲切，可以适当使用 Emoji，像一个靠谱的学长。
2. **知识引用**：回答问题时，优先基于通用的技术常识和神州数码（Digital China）的背景（假设）。
3. **结构清晰**：使用 Markdown 格式，重要信息加粗。
4. **Chain of Thought**：在正式回答前，先在 <thinking> 标签中简要分析用户的意图和回答策略。

请根据用户的提问进行解答。`;

    try {
      // 调用真实 AI 服务
      await getAIResponse(questionInput, systemPrompt, config, 'gemini-3-flash-preview', (chunk) => {
        setReport(prev => prev + chunk);
      });
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setReport(`❌ **连接中断** \n\n码哥暂时掉线了，错误信息：${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 模拟 AI 流式输出效果 - 调慢速度以增加真实感
  const simulateAIStreaming = async (text: string) => {
    // 每次输出 1-3 个字符，看起来更像一个个字蹦出来
    const chunkSize = 2; 
    
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      setReport(prev => prev + chunk);
      
      // 随机延迟 20ms - 60ms，模拟 Token 生成的不均匀感
      const delay = 20 + Math.random() * 40; 
      await new Promise(resolve => setTimeout(resolve, delay)); 
    }
  };

  useEffect(() => {
    if (reportEndRef.current) {
      reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [report, isThinkingExpanded]);

  const renderContent = () => {
    const thinkMatch = report.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/);
    const hasThinking = !!thinkMatch;
    const thinkingContent = thinkMatch ? thinkMatch[1] : '';
    const finalReport = report.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/, '').trim();

    return (
      <div className="space-y-6">
        {hasThinking && (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 overflow-hidden shadow-sm">
            <button 
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Brain className={`w-4 h-4 ${isAnalyzing && !finalReport ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-xs font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">
                  AI 思考过程 (Chain of Thought)
                </span>
              </div>
              {isThinkingExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>
            
            {isThinkingExpanded && (
              <div className="p-6 border-t border-slate-700/30">
                <div className="text-slate-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {thinkingContent}
                  {isAnalyzing && !report.includes('</thinking>') && (
                    <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse align-middle"></span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {finalReport && (
          <div className="animate-in fade-in duration-500 slide-in-from-bottom-4">
             <div 
              className="prose prose-invert prose-slate markdown-body max-w-none"
              dangerouslySetInnerHTML={{ __html: marked.parse(finalReport) as string }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-5">
          {/* GraduationCap (代表新人/学习) */}
          <div className="bg-emerald-500 p-3 rounded-2xl shadow-xl shadow-emerald-100">
            <GraduationCap className="text-white w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-[900] text-slate-900 tracking-tight">码哥小助手</h2>
            <p className="text-slate-400 text-lg font-semibold mt-1">依托神州大脑知识库，帮助新人快速过渡。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        {/* Left: Input (White Card) */}
        <div className="lg:col-span-5 bg-white rounded-[3rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            <span className="text-base font-black text-slate-500 uppercase tracking-widest">职场问题输入</span>
          </div>
          <div className="flex-1 p-8 flex flex-col space-y-6">
            <div className="flex-1 bg-slate-50/50 rounded-[2rem] border border-slate-100 p-2 focus-within:ring-4 focus-within:ring-emerald-50 transition-all">
              <textarea
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="你好，我是新来的，请问怎么配置开发环境？&#10;或者：公司的开发流程是什么样呀？"
                className="w-full h-full bg-transparent rounded-2xl p-6 text-lg font-medium focus:outline-none resize-none leading-relaxed text-slate-600 placeholder:text-slate-300"
              />
            </div>
            <button
              onClick={startAnalysis}
              disabled={isAnalyzing || !questionInput}
              className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-4 transition-all ${
                isAnalyzing || !questionInput 
                  ? 'bg-slate-100 text-slate-300' 
                  : 'bg-slate-100 text-slate-500 hover:bg-emerald-500 hover:text-white hover:shadow-2xl hover:shadow-emerald-200'
              }`}
            >
              {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-5 h-5" />}
              {isAnalyzing ? '正在查询知识库...' : '提交问题'}
            </button>
          </div>
        </div>

        {/* Right: Output (Black Card) */}
        <div className="lg:col-span-7 bg-[#0f172a] rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
          <div className="px-10 py-6 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <Bot className="w-5 h-5 text-emerald-400" />
              <span className="text-base font-black text-slate-300 uppercase tracking-widest">AI 核心答复</span>
            </div>
            {isAnalyzing && (
              <div className="flex items-center gap-3">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs text-emerald-400 font-black uppercase">Thinking</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-14 scroll-smooth no-scrollbar">
            {!report && !isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center opacity-10">
                <Coffee className="w-24 h-24 text-slate-400 mb-6" />
                <p className="text-lg font-black text-slate-400 uppercase tracking-widest">有什么不懂的，尽管问我</p>
              </div>
            ) : (
              <div className="max-w-none">
                {renderContent()}
                <div ref={reportEndRef} className="h-8" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewcomerGuide;
