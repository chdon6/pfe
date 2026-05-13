from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_classic.chains import RetrievalQA
from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate

# Load vector store
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma(persist_directory="./pma_chroma_db", embedding_function=embeddings)

# Use Ollama with the model you pulled
llm = Ollama(model="llama3.2:3b")

PMA_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are a PMA (assisted reproduction) documentation assistant, in the spirit of a clinical copilot: fast, precise, and faithful to the record.

Rules:
- Base your answer ONLY on the Context below. If the Context is empty or does not contain the answer, say clearly that this information is not in the provided PMA extracts — do not invent patients, cycles, labs, or outcomes.
- For greetings or very general chitchat, reply briefly and invite the user to ask about patients, cycles, protocols, or outcomes found in the Context.
- Use the same language as the user's question when reasonable (e.g. French or English).
- End with a short reminder that answers are for documentation support and must be validated by qualified staff; you do not provide medical decisions.

Context:
{context}

Question:
{question}

Answer:""",
)

# Create QA chain
qa = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
    return_source_documents=True,
    chain_type_kwargs={"prompt": PMA_PROMPT},
)

_SIMPLE_GREETINGS = frozenset(
    {"hi", "hello", "hey", "bonjour", "salut", "coucou", "good morning", "good afternoon", "good evening"}
)


def _is_simple_greeting(text: str) -> bool:
    t = text.strip().lower()
    return t in _SIMPLE_GREETINGS


def ask(question: str) -> tuple[str, list]:
    """Return (answer_text, source_documents). Uses invoke() per LangChain deprecation of .run()."""
    if _is_simple_greeting(question):
        return (
            "Hello — I'm your PMA assistant. Ask about a patient, cycle, protocol, oocyte count, or pregnancy "
            "outcome from your ingested records. I'll stick to what appears in your PMA data extracts.\n\n"
            "Reminder: I'm for documentation support only; clinical decisions stay with your care team.",
            [],
        )
    out = qa.invoke({"query": question})
    return out["result"], out.get("source_documents", [])


def _format_sources(docs: list, limit: int = 3) -> str:
    if not docs:
        return ""
    lines = []
    for i, d in enumerate(docs[:limit], start=1):
        preview = (d.page_content or "").strip().replace("\n", " ")
        if len(preview) > 220:
            preview = preview[:217] + "..."
        lines.append(f"  [{i}] {preview}")
    return "\nSources (retrieved chunks):\n" + "\n".join(lines)


if __name__ == "__main__":
    print("PMA Chatbot ready! Ask questions about your PMA data.")
    while True:
        q = input("\nYou: ")
        if q.lower() in ["quit", "exit"]:
            break
        answer, sources = ask(q)
        print("Bot:", answer)
        src_block = _format_sources(sources)
        if src_block:
            print(src_block)
