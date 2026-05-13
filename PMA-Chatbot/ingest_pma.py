from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
import sqlite3

def get_pma_data():
    # Create a dummy SQLite database with sample PMA data
    conn = sqlite3.connect("pma_database.db")
    cursor = conn.cursor()
    # Create tables if they don't exist
    cursor.execute('CREATE TABLE IF NOT EXISTS patients (id int, age int, diagnosis text)')
    cursor.execute('CREATE TABLE IF NOT EXISTS cycles (id int, patient_id int, cycle_number int, protocol text, oocytes_retrieved int)')
    cursor.execute('CREATE TABLE IF NOT EXISTS outcomes (id int, cycle_id int, pregnancy text)')
    # Insert sample data if empty
    cursor.execute("SELECT COUNT(*) FROM patients")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO patients VALUES (1, 34, 'unexplained')")
        cursor.execute("INSERT INTO cycles VALUES (1, 1, 1, 'Antagonist', 12)")
        cursor.execute("INSERT INTO outcomes VALUES (1, 1, 'positive')")
        conn.commit()
    # Query data
    cursor.execute("""
        SELECT p.id, p.age, p.diagnosis,
               c.cycle_number, c.protocol, c.oocytes_retrieved,
               o.pregnancy
        FROM patients p
        LEFT JOIN cycles c ON p.id = c.patient_id
        LEFT JOIN outcomes o ON c.id = o.cycle_id
    """)
    rows = cursor.fetchall()
    conn.close()
    return rows

def build_vector_store():
    rows = get_pma_data()
    documents = []
    for row in rows:
        text = f"""
        Patient ID: {row[0]}, Age: {row[1]}, Diagnosis: {row[2]}
        Cycle {row[3]}: Protocol = {row[4]}, Oocytes retrieved = {row[5]}
        Pregnancy outcome: {row[6]}
        """
        documents.append(text)

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = text_splitter.create_documents(documents)

    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = Chroma.from_documents(chunks, embeddings, persist_directory="./pma_chroma_db")
    vectorstore.persist()
    print(f"Ingested {len(chunks)} chunks into Chroma DB")

if __name__ == "__main__":
    build_vector_store()
