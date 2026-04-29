"""Multi-source document ingestion loaders."""

from .pdf_loader import load_pdf
from .url_loader import load_url
from .text_loader import load_text

__all__ = ["load_pdf", "load_url", "load_text"]
