import streamlit as st
import time
import json
import os
import requests
import random

# ==========================================
# 1. 页面基础配置 (必须在第一行)
# ==========================================
st.set_page_config(
    page_title="神码智核 - 核心交付底座",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==========================================
# 2. CSS 魔法：复刻 App.tsx 的视觉设计
# ==========================================
# 这里我们将 App.tsx 里的 Tailwind 样式翻译成了原生 CSS
st.markdown("""
<style>
    /* 1. 全局字体与背景 - 对应 bg-[#f3f7fa] */
    .stApp {
        background-color: #f3f7fa;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* 2. 隐藏 Streamlit 默认的顶部红线和菜单 */
    header[data-testid="stHeader"] {
        display: none;
    }

    /* 3. 侧边栏美化 - 对应白色背景 */
    section[data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid #e2e8f0;
        box-shadow: 2px 0 5px rgba(0,0,0,0.02);
    }

    /* 4. 自定义顶部导航栏 (Header) */
    .custom-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 70px;
        background-color: rgba(255, 255, 255, 0.9); /* backdrop-blur */
        backdrop-filter: blur(12px);
        border-bottom: 1px solid #f1f5f9;
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 40px;
        margin-left: 20rem; /* 留出侧边栏宽度 */
    }
    /* 响应式调整：如果侧边栏收起，Header要撑满 */
    @media (max-width: 992px) {
        .custom-header { margin-left: 0; }
    }

    /* Header 左侧品牌 */
    .brand-text {
        font-size: 11px;
        font-weight: 900;
        color: #cbd5e1;
        text-transform: uppercase;
        letter-spacing: 0.25em;
    }
    .page-title {
        font-size: 14px;
        font-weight: 800;
        color: #334155;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-left: 15px;
        padding-left: 15px;
        border-left: 2px solid #e2e8f0;
    }

    /* Header 右侧用户卡片 */
    .user-card {
        display: flex;
        align-items: center;
        gap: 15px;
        cursor: pointer;
    }
    .user-info {
        text-align: right;
        line-height: 1.2;
    }
    .user-name {
        font-size: 13px;
        font-weight: 900;
        color: #0f172a;
    }
    .user-role {
        font-size: 10px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .user-avatar {
        width: 42px;
        height: 42px;
        background-color: #2563eb; /* Blue-600 */
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
        border: 3px solid white;
    }

    /* 5. 内容区容器 - 白卡风格 */
    .content-card {
        background: white;
        border-radius: 24px;
        padding: 30px;
        border: 1px solid #f1f5f9;
        box-shadow: 0 10px 30px rgba(0,0,0,0.02);
        margin-top: 20px;
    }

    /* 6. 按钮样式覆盖 */
    .stButton button {
        background-color: #2563eb;
        color: white;
        border-radius: 10px;
        font-weight: 600;
        border: none;
        transition: all 0.2s;
    }
    .stButton button:hover {
        background-color: #1d4ed8;
        box-shadow: 0 5px 15px rgba(37, 99, 235, 0.3);
    }

    /* 调整主内容区域的上边距，防止被 Header 遮挡 */
    .block-container {
        padding-top: 90px;
    }
</style>
""", unsafe_allow_html=True)


# ==========================================
# 3. 后端逻辑区 (知识库 & Ollama)
# ==========================================

# 加载本地知识库
@st.cache_data
def load_knowledge_base():
    path = os.path.join("public", "knowledge_index.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


knowledge_base = load_knowledge_base()


# RAG 检索逻辑
def search_knowledge(query, top_k=3):
    if not knowledge_base: return []
    # 简单关键词匹配
    results = [item for item in knowledge_base if query in item["content"]]
    return results[:top_k]


# Ollama 调用逻辑
def call_ollama_stream(model, messages):
    url = "http://localhost:11434/api/chat"
    payload = {"model": model, "messages": messages, "stream": True}
    try:
        with requests.post(url, json=payload, stream=True) as response:
            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        body = json.loads(line)
                        if "message" in body:
                            yield body["message"]["content"]
            else:
                yield f"❌ Error: {response.status_code}"
    except:
        yield "❌ 请确认本地 Ollama 已运行 `ollama serve`"


# ==========================================
# 4. 侧边栏导航 (Sidebar)
# ==========================================
with st.sidebar:
    st.image("public/logo.png" if os.path.exists(
        "public/logo.png") else "https://img.icons8.com/color/96/000000/source-code.png", width=60)
    st.markdown("### 神码智核")
    st.caption("核心交付部 · 效能底座")

    st.markdown("---")

    # 使用 Radio 实现导航，类似 App.tsx 的 sidebar
    nav = st.radio(
        "功能导航",
        ["🎓 码哥小助手", "🩺 智能故障诊断", "📊 业务差异分析", "📚 知识库管理"],
        label_visibility="collapsed"
    )

    st.markdown("---")

    # 模型配置区
    st.markdown("#### ⚙️ 模型配置")
    selected_model = st.selectbox("推理引擎", ["qwen3-vl:8b", "deepseek-r1", "llama3"], index=0)
    temperature = st.slider("Temperature", 0.0, 1.0, 0.1)

    st.info(f"🟢 系统在线\n\n已加载 {len(knowledge_base)} 个知识切片")

# ==========================================
# 5. 自定义 Header (HTML 注入)
# ==========================================
# 根据当前页面动态显示标题
page_titles = {
    "🎓 码哥小助手": "Newcomer Guide",
    "🩺 智能故障诊断": "Fault Diagnosis",
    "📊 业务差异分析": "Business Analysis",
    "📚 知识库管理": "Knowledge Base"
}
current_en_title = page_titles.get(nav, "Dashboard")

header_html = f"""
<div class="custom-header">
    <div style="display:flex; align-items:center;">
        <span class="brand-text">DIGITAL CHINA</span>
        <span class="page-title">{current_en_title}</span>
    </div>
    <div style="display:flex; align-items:center; gap: 20px;">
        <div style="color: #94a3b8; cursor: pointer;">🔔</div>
        <div style="color: #94a3b8; cursor: pointer;">❓</div>
        <div style="width:1px; height:24px; background:#f1f5f9;"></div>

        <div class="user-card">
            <div class="user-info">
                <div class="user-name">Delivery Admin</div>
                <div class="user-role">系统交付专家</div>
            </div>
            <div class="user-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
        </div>
    </div>
</div>
"""
st.markdown(header_html, unsafe_allow_html=True)

# ==========================================
# 6. 主功能区域渲染
# ==========================================

# --- 功能 1: 码哥小助手 ---
if nav == "🎓 码哥小助手":
    st.markdown("### 👋 欢迎回来，有什么可以帮您？")

    # 聊天容器
    chat_container = st.container()
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    with chat_container:
        for msg in st.session_state.chat_history:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

    # 输入框
    if prompt := st.chat_input("我是新来的，请问怎么配置开发环境？"):
        st.session_state.chat_history.append({"role": "user", "content": prompt})
        with chat_container:
            with st.chat_message("user"):
                st.markdown(prompt)

            with st.chat_message("assistant"):
                # RAG 检索
                docs = search_knowledge(prompt)
                context = "\n".join([d['content'] for d in docs])
                sys_prompt = f"你是一个友好的技术导师。参考文档：{context}\n回答用户：{prompt}"

                response_ph = st.empty()
                full_res = ""
                for chunk in call_ollama_stream(selected_model, [{"role": "user", "content": sys_prompt}]):
                    full_res += chunk
                    response_ph.markdown(full_res + "▌")
                response_ph.markdown(full_res)

                if docs:
                    with st.expander("📖 参考文档"):
                        for d in docs: st.markdown(f"- {d['content'][:100]}...")

        st.session_state.chat_history.append({"role": "assistant", "content": full_res})

# --- 功能 2: 智能故障诊断 ---
elif nav == "🩺 智能故障诊断":
    st.markdown("### 🩺 全链路故障根因分析")
    st.caption("Zero-touch 诊断：输入流水号，自动拉取日志并生成台账")

    col1, col2 = st.columns([1, 1], gap="large")

    with col1:
        st.markdown('<div class="content-card">', unsafe_allow_html=True)
        st.subheader("📥 现场数据输入")
        tab_in1, tab_in2 = st.tabs(["流水号拉取", "手动粘贴"])

        log_content = ""
        with tab_in1:
            serial = st.text_input("交易流水号", value="SEQ-20260130-001")
            if st.button("📡 连接 ESB 拉取"):
                with st.status("正在追踪链路..."):
                    time.sleep(1)
                    st.write("✅ 已获取核心交易日志")
                log_content = """[ERROR] 2026-01-30 14:23:01 [Gateway] Connection timed out calling [LoanCore_V2]
Error Code: ESB-TIMEOUT-0092
TraceId: 7f8a9b2c-1d3e"""
                st.session_state.log_cache = log_content

            if "log_cache" in st.session_state:
                log_content = st.session_state.log_cache
                st.code(log_content, language="log")

        with tab_in2:
            log_content = st.text_area("粘贴报错堆栈", height=200)

        analyze_btn = st.button("⚡ 开始智能诊断", type="primary", use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with col2:
        # 这是一个深色控制台风格的输出区
        st.markdown("""
        <div style="background:#0f172a; border-radius:24px; padding:30px; min-height:500px; color:#e2e8f0; font-family:'JetBrains Mono', monospace;">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid #334155; padding-bottom:10px;">
                <span>✨ AI DIAGNOSIS REPORT</span>
                <span style="color:#4ade80;">● ONLINE</span>
            </div>
            <div id="report-area"></div>
        """, unsafe_allow_html=True)

        if analyze_btn and log_content:
            report_ph = st.empty()
            prompt = f"分析此日志：{log_content}。请以Markdown表格形式输出：错误类型、定位组件、根因、建议。"

            full_text = ""
            for chunk in call_ollama_stream(selected_model, [{"role": "user", "content": prompt}]):
                full_text += chunk
                # 这是一个 Hack，为了让文字显示在深色背景里，我们直接打印 Markdown
                # 实际 Streamlit 限制，这里只能渲染在 div 下方，但在视觉上我们尽量贴合
                report_ph.markdown(f"""
                <div style="background:#0f172a; color:#e2e8f0; padding:10px; border-radius:10px;">
                {full_text}
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("👈 等待输入数据...")

        st.markdown("</div>", unsafe_allow_html=True)

# --- 功能 3: 业务差异分析 (占位) ---
elif nav == "📊 业务差异分析":
    st.info("🚧 该模块正在开发中，将支持存贷业务规则的自动比对。")

# --- 功能 4: 知识库管理 ---
elif nav == "📚 知识库管理":
    st.markdown("### 📚 交付知识库透视")
    c1, c2 = st.columns(2)
    c1.metric("已向量化文档", len(knowledge_base))
    c2.metric("Embedding 维度", "768 (Qwen)")

    st.markdown("#### 📂 索引切片预览")
    for item in knowledge_base[:5]:
        with st.expander(f"📄片段 ID: {item.get('id', 'N/A')}"):
            st.write(item['content'])
            if 'vector' in item:
                st.caption("包含向量数据")