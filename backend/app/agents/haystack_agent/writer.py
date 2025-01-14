from typing import List
import asyncio
from concurrent.futures import ThreadPoolExecutor
from haystack import Document
from haystack.components.writers import DocumentWriter
import logging

logger = logging.getLogger(__name__)


class AsyncDocumentWriter(DocumentWriter):
    def __init__(self, document_store, **kwargs):
        super().__init__(document_store=document_store, **kwargs)
        self.executor = ThreadPoolExecutor(max_workers=1)

    def run(self, documents: List[Document]):
        """
        Override run method to handle async operations in a sync context
        """
        try:
            # Create event loop for async operations
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            # Run async write in the loop
            result = loop.run_until_complete(
                self.document_store.write_documents(documents)
            )

            loop.close()
            return {"documents_written": len(documents)}

        except Exception as e:
            logger.error(f"Document writing failed: {str(e)}")
            raise

    async def cleanup(self):
        """Clean up resources"""
        if hasattr(self, "executor") and self.executor:
            try:
                self.executor.shutdown(wait=True)
            except Exception as e:
                logger.error(f"Error during writer cleanup: {str(e)}")

    def __del__(self):
        """Cleanup executor on deletion"""
        if hasattr(self, "executor") and self.executor:
            try:
                self.executor.shutdown(wait=False)
            except Exception as e:
                logger.error(f"Error during writer executor shutdown: {str(e)}")
