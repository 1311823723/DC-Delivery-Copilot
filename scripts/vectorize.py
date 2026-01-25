import json
import os
import glob
import docx2txt  # <--- 1. 引入这个新库
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

# 配置路径
DOCS_DIR = "../documents"
OUTPUT_FILE = "../public/knowledge_index.json"


def main():
    print("🚀 开始构建知识库...")

    # 2. 读取文档 (支持 txt, md, AND docx!)
    # 扫描目录下所有的 txt, md 和 docx 文件
    files = glob.glob(os.path.join(DOCS_DIR, "*.md")) + \
            glob.glob(os.path.join(DOCS_DIR, "*.txt")) + \
            glob.glob(os.path.join(DOCS_DIR, "*.docx"))  # <--- 2. 增加 docx 扫描

    if not files:
        print(f"⚠️  在 {DOCS_DIR} 没找到文档，请放入 .docx, .md 或 .txt 文件")
        return

    all_text = ""
    for f in files:
        try:
            print(f"📄 正在读取: {os.path.basename(f)}...")

            # --- 核心改动开始 ---
            if f.endswith(".docx"):
                # 如果是 Word 文档，用 docx2txt 读取
                text = docx2txt.process(f)
                all_text += text + "\n"
            else:
                # 如果是普通文本，用标准方式读取
                with open(f, 'r', encoding='utf-8') as file:
                    all_text += file.read() + "\n"
            # --- 核心改动结束 ---

            print(f"✅ 已加载: {os.path.basename(f)}")
        except Exception as e:
            print(f"❌ 读取失败 {f}: {e}")

    # 3. 文本切片 (Chunking)
    print("✂️  正在切分文本...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", "。", "！", "？", ";"]
    )
    chunks = text_splitter.create_documents([all_text])
    print(f"wb 共切分为 {len(chunks)} 个知识片段")

    # 4. 向量化 (Embedding)
    print("🧠 正在进行向量化计算 (Loading model...)...")
    # 依然使用这个免费好用的本地模型
    embeddings_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    knowledge_base = []

    for i, chunk in enumerate(chunks):
        # 这里的 embed_query 可能会花一点时间，取决于文档长度
        vector = embeddings_model.embed_query(chunk.page_content)
        knowledge_base.append({
            "id": i,
            "content": chunk.page_content,
            "vector": vector,
            "source": "开发手册库"
        })

    # 5. 保存
    # 确保输出目录存在
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(knowledge_base, f, ensure_ascii=False)

    print(f"🎉 成功！知识库已生成至: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()