import streamlit as st
import time
import json
import os
import requests
import re  # 引入正则，用于分词

# ==========================================
# 1. 页面基础配置
# ==========================================
st.set_page_config(
    page_title="神码智核 - 核心交付底座",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==========================================
# 2. CSS 魔法 (保持不变，用于美化)
# ==========================================
st.markdown("""
<style>
    .stApp { background-color: #f3f7fa; font-family: 'Inter', sans-serif; }
    header[data-testid="stHeader"] { display: none; }
    section[data-testid="stSidebar"] { background-color: #ffffff; border-right: 1px solid #e2e8f0; }

    .custom-header {
        position: fixed; top: 0; left: 0; right: 0; height: 70px;
        background-color: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px);
        border-bottom: 1px solid #f1f5f9; z-index: 999;
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 40px; margin-left: 20rem;
    }
    @media (max-width: 992px) { .custom-header { margin-left: 0; } }

    .brand-text { font-size: 11px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.25em; }
    .page-title { font-size: 14px; font-weight: 800; color: #334155; text-transform: uppercase; margin-left: 15px; padding-left: 15px; border-left: 2px solid #e2e8f0; }

    .user-card { display: flex; align-items: center; gap: 15px; }
    .user-info { text-align: right; line-height: 1.2; }
    .user-name { font-size: 13px; font-weight: 900; color: #0f172a; }
    .user-role { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
    .user-avatar { width: 42px; height: 42px; background-color: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }

    .content-card { background: white; border-radius: 24px; padding: 30px; border: 1px solid #f1f5f9; box-shadow: 0 10px 30px rgba(0,0,0,0.02); margin-top: 20px; }
    .stButton button { background-color: #2563eb; color: white; border-radius: 10px; border: none; }
    .stButton button:hover { background-color: #1d4ed8; }
    .block-container { padding-top: 90px; }
</style>
""", unsafe_allow_html=True)


# ==========================================
# 3. 后端逻辑区 (已修复 RAG 和 模型)
# ==========================================

# 加载知识库
@st.cache_data
def load_knowledge_base():
    path = os.path.join("public", "knowledge_index.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


knowledge_base = load_knowledge_base()


# ✨ 修复 2：升级版检索逻辑 (关键词分词匹配)
def search_knowledge(query, top_k=3):
    if not knowledge_base: return []

    # 1. 把用户问题切成词 (比如 "网关报错" -> "网关", "报错")
    # 简单按空格或中文分词逻辑（这里简单处理，把问题按字或者空格切分）
    # 为了演示效果，我们直接判断 query 里的关键词是否出现在文档里

    scored_results = []

    for item in knowledge_base:
        content = item["content"]
        score = 0

        # 简单算法：用户输入的每个字/词，如果在文档里出现，就加分
        # 比如搜 "网关超时"，文档里有 "网关" +1分，有 "超时" +1分
        if query in content:
            score += 10  # 这种是完全匹配，分最高
        else:
            # 简单的字面重叠率计算
            for char in query:
                if char in content:
                    score += 0.5

        if score > 1:  # 只有一点相关性的才要
            scored_results.append((score, item))

    # 按分数从高到低排序
    scored_results.sort(key=lambda x: x[0], reverse=True)

    # 返回前 K 个
    return [x[1] for x in scored_results[:top_k]]


# Ollama 调用
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
# 4. 侧边栏导航
# ==========================================
with st.sidebar:
    # ✨ 修复 1：只加载本地图片，如果不存就什么都不显示，不再显示奇怪的 URL 图片
    logo_path = "public/logo.png"
    if os.path.exists(logo_path):
        st.image(logo_path, width=60)
    else:
        # 如果没图，就显示一个文字 Logo 代替
        st.markdown("### 🚀 神码智核")

    st.caption("核心交付部 · 效能底座")
    st.markdown("---")

    nav = st.radio(
        "功能导航",
        ["🎓 码哥小助手", "🩺 智能故障诊断", "📊 业务差异分析", "📚 知识库管理"],
        label_visibility="collapsed"
    )

    st.markdown("---")

    # ✨ 修复 3：在列表里加上你的 qwen3-vl:8b
    st.markdown("#### ⚙️ 模型配置")
    selected_model = st.selectbox(
        "推理引擎",
        ["qwen3-vl:8b", "deepseek-r1", "llama3", "qwen2.5"],  # <--- 这里加进去了！
        index=0
    )

    st.info(f"🟢 系统在线\n\n已加载 {len(knowledge_base)} 个知识切片")

# ==========================================
# 5. Header 和 主界面
# ==========================================
page_titles = {"🎓 码哥小助手": "Newcomer Guide", "🩺 智能故障诊断": "Fault Diagnosis",
               "📊 业务差异分析": "Business Analysis", "📚 知识库管理": "Knowledge Base"}
current_en_title = page_titles.get(nav, "Dashboard")

# 渲染 Header
header_html = f"""
<div class="custom-header">
    <div style="display:flex; align-items:center;">
        <span class="brand-text">DIGITAL CHINA</span>
        <span class="page-title">{current_en_title}</span>
    </div>
    <div style="display:flex; align-items:center; gap: 20px;">
        <div style="color: #94a3b8; cursor: pointer;">🔔</div>
        <div class="user-card">
            <div class="user-info">
                <div class="user-name">Delivery Admin</div>
                <div class="user-role">系统交付专家</div>
            </div>
            <div class="user-avatar">User</div>
        </div>
    </div>
</div>
"""
st.markdown(header_html, unsafe_allow_html=True)

# --- 功能 1: 码哥小助手 ---
if nav == "🎓 码哥小助手":
    st.markdown("### 👋 欢迎回来，有什么可以帮您？")

    chat_container = st.container()
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    with chat_container:
        for msg in st.session_state.chat_history:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

    if prompt := st.chat_input("我是新来的，请问怎么配置开发环境？"):
        st.session_state.chat_history.append({"role": "user", "content": prompt})
        with chat_container:
            with st.chat_message("user"):
                st.markdown(prompt)

            with st.chat_message("assistant"):
                # RAG 检索
                docs = search_knowledge(prompt)

                # 构造 Prompt：强制要求参考文档
                if docs:
                    context = "\n".join([f"- {d['content']}" for d in docs])
                    sys_prompt = (
                        f"你是一个友好的技术导师。请务必基于以下【参考文档】回答用户的问题。\n"
                        f"如果参考文档里没有答案，请告诉用户文档里没写，不要瞎编。\n\n"
                        f"【参考文档】：\n{context}\n\n"
                        f"用户问题：{prompt}"
                    )
                    st.toast(f"已检索到 {len(docs)} 条相关文档", icon="📚")  # 提示一下用户检索成功
                else:
                    sys_prompt = f"你是一个友好的技术导师。用户问：{prompt}。本地知识库没找到相关内容，请用你的通用知识回答，但要提示用户去更新文档。"

                response_ph = st.empty()
                full_res = ""
                for chunk in call_ollama_stream(selected_model, [{"role": "user", "content": sys_prompt}]):
                    full_res += chunk
                    response_ph.markdown(full_res + "▌")
                response_ph.markdown(full_res)

                if docs:
                    with st.expander("📖 查看参考的知识库片段"):
                        for d in docs: st.info(d['content'][:200] + "...")

        st.session_state.chat_history.append({"role": "assistant", "content": full_res})

# --- 功能 2: 智能故障诊断 ---
elif nav == "🩺 智能故障诊断":
    st.markdown("### 🩺 全链路故障根因分析")
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
                report_ph.markdown(f"""
                <div style="background:#0f172a; color:#e2e8f0; padding:10px; border-radius:10px;">
                {full_text}
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("👈 等待输入数据...")

        st.markdown("</div>", unsafe_allow_html=True)

# --- 功能 3: 知识库管理 ---
elif nav == "📚 知识库管理":
    st.markdown("### 📚 交付知识库透视")
    st.metric("已向量化文档", len(knowledge_base))

    st.markdown("#### 📂 索引切片预览")
    for item in knowledge_base[:5]:
        with st.expander(f"📄片段 ID: {item.get('id', 'N/A')}"):
            st.write(item['content'])