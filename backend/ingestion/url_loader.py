"""URL document loader — scrapes a webpage and returns LangChain Documents."""

from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter


def load_url(url: str) -> list:
    """
    Scrape a URL, split the text into chunks, and attach metadata.

    Args:
        url: The webpage URL to scrape.
    Returns:
        List of LangChain Document objects ready for embedding.
    """
    loader = WebBaseLoader(url)
    raw_docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len,
    )
    chunks = splitter.split_documents(raw_docs)

    for chunk in chunks:
        chunk.metadata["source_type"] = "url"
        chunk.metadata["source_name"] = url

    return chunks
