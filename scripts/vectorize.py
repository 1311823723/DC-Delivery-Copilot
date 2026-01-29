import json
import os
import glob
import fitz  # PyMuPDF
import docx2txt
from rapidocr_onnxruntime import RapidOCR
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
# === 配置区域 ===
# 文档存放目录
DOCS_DIR = "../documents"
# 输出的向量库文件 (给前端用的伪数据库)
OUTPUT_FILE = "../public/knowledge_index.json"

# 初始化 OCR 引擎
# 首次运行会自动下载模型，稍微等一下
ocr_engine = RapidOCR()


def extract_pdf_content(pdf_path):
    """
    深度解析 PDF：
    1. 提取原生文本
    2. 提取图片并进行 OCR 识别 (专治架构图和报错截图)
    """
    doc = fitz.open(pdf_path)
    full_text = ""
    print(f"    ...正在深度解析 PDF (含OCR): {os.path.basename(pdf_path)}")

    for i, page in enumerate(doc):
        # 1. 提取页面原生文本
        text = page.get_text()
        full_text += text + "\n"

        # 2. 提取页面内的图片并进行 OCR
        image_list = page.get_images(full=True)
        if image_list:
            # print(f"      - 第 {i+1} 页发现 {len(image_list)} 张图片，正在识别...")
            for img_index, img in enumerate(image_list):
                try:
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]

                    # 调用 RapidOCR 识别
                    ocr_result, _ = ocr_engine(image_bytes)

                    if ocr_result:
                        # ocr_result 是列表，拼接所有识别出的文字
                        img_text = " ".join([res[1] for res in ocr_result])
                        if img_text.strip():
                            # 给图片内容加个特殊的标记，方便调试和检索
                            full_text += f"\n>>> [第{i + 1}页·架构图/截图识别]: {img_text}\n"
                except Exception as e:
                    pass  # 图片识别失败就不管了，继续

    return full_text


def main():
    print("🚀 开始构建多模态向量知识库...")

    # 1. 扫描所有支持的文件类型
    files = glob.glob(os.path.join(DOCS_DIR, "*.md")) + \
            glob.glob(os.path.join(DOCS_DIR, "*.txt")) + \
            glob.glob(os.path.join(DOCS_DIR, "*.docx")) + \
            glob.glob(os.path.join(DOCS_DIR, "*.pdf"))

    if not files:
        print(f"⚠️  在 {DOCS_DIR} 没找到文档，请放入 .pdf, .docx, .md 或 .txt 文件")
        return

    all_text = ""

    # 2. 逐个读取文件内容
    for f in files:
        try:
            print(f"📄 正在读取: {os.path.basename(f)}...")

            if f.endswith(".docx"):
                text = docx2txt.process(f)
                all_text += text + "\n"

            elif f.endswith(".pdf"):
                # 使用上面的 OCR 增强函数
                text = extract_pdf_content(f)
                all_text += text + "\n"

            else:
                # 普通文本
                with open(f, 'r', encoding='utf-8') as file:
                    all_text += file.read() + "\n"

            print(f"✅ 已加载: {os.path.basename(f)}")
        except Exception as e:
            print(f"❌ 读取失败 {f}: {e}")

    # 3. 文本切片 (Chunking)
    print("✂️  正在切分文本...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,  # 每个片段的大小
        chunk_overlap=100,  # 重叠部分，防止切断上下文
        separators=["\n\n", "\n", "。", "！", "？", ">>>"]  # 把我们刚才加的图片标记也作为分隔符
    )
    chunks = text_splitter.create_documents([all_text])
    print(f"📊 共切分为 {len(chunks)} 个知识片段")

    # 4. 向量化 (Embedding)
    print("🧠 正在计算向量 (加载模型可能需要几十秒)...")
    # 使用轻量级模型，不需要 GPU 也能跑
    embeddings_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    knowledge_base = []

    for i, chunk in enumerate(chunks):
        # 计算向量
        vector = embeddings_model.embed_query(chunk.page_content)
        knowledge_base.append({
            "id": i,
            "content": chunk.page_content,
            "vector": vector,
            "source": "Core_Knowledge_Base"
        })

    # 5. 保存为 JSON (充当向量数据库)
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(knowledge_base, f, ensure_ascii=False)

    print(f"🎉 成功！知识库已生成至: {OUTPUT_FILE}")
    print("👉 现在你可以去运行前端代码了，它会自动读取这个文件！")


if __name__ == "__main__":
    main()
