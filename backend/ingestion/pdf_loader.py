"""PDF document loader — chunks a PDF and returns LangChain Documents."""

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter


def load_pdf(file_path: str) -> list:
    """
    Load a PDF file, split into chunks, and attach metadata.

    Args:
        file_path: Absolute or relative path to the PDF.
    Returns:
        List of LangChain Document objects ready for embedding.
    """
    loader = PyPDFLoader(file_path)
    raw_docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len,
    )
    chunks = splitter.split_documents(raw_docs)

    # Enrich each chunk with ingestion metadata
    for chunk in chunks:
        chunk.metadata["source_type"] = "pdf"
        chunk.metadata["source_name"] = file_path.split("/")[-1]

    return chunks
