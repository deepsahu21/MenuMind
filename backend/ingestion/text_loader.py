"""Plain text document loader — chunks a .txt file and returns LangChain Documents."""

from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter


def load_text(file_path: str) -> list:
    """
    Load a plain text file, split into chunks, and attach metadata.

    Args:
        file_path: Absolute or relative path to the .txt file.
    Returns:
        List of LangChain Document objects ready for embedding.
    """
    loader = TextLoader(file_path, encoding="utf-8")
    raw_docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len,
    )
    chunks = splitter.split_documents(raw_docs)

    for chunk in chunks:
        chunk.metadata["source_type"] = "text"
        chunk.metadata["source_name"] = file_path.split("/")[-1]

    return chunks
