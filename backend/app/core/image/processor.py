from app.core.logging_config import get_logger
from typing import Dict, Any, Optional
import json
import uuid
from datetime import datetime
from langchain_openai import ChatOpenAI
from app.core.config import settings


logger = get_logger(__name__)
class ImageProcessor:
    """Dynamic image processing with GPT-4 Vision"""
    
    def __init__(self):
        self.vision_model = ChatOpenAI(
            model="gpt-4-vision-preview",
            api_key=settings.OPENAI_API_KEY,
            max_tokens=1500,
            temperature=0.2
        )
    
    async def analyze_image(self, image_data: bytes, user_query: Optional[str] = None) -> Dict:
        """Analyze image using GPT-4 Vision with dynamic field extraction"""
        try:
            vision_prompt = """
            Analyze this image in detail. For each piece of information you find:
            1. Identify and extract all text and relevant information
            2. Determine the document type based on content and layout
            3. Note any important patterns, fields, or structures
            4. Identify any validation requirements specific to this type of document

            Provide the information in the following JSON structure:
            {
                "document_type": "detected document type",
                "extracted_text": "all raw text found in image",
                "fields": {
                    "field_name": "value",
                    ...
                },
                "confidence_score": 0.95,
                "validation_notes": ["any validation or quality notes"]
            }
            """
            
            if user_query:
                vision_prompt += f"\n\nSpecific user query to focus on: {user_query}"
            
            # Call Vision API
            response = await self._call_vision_api(image_data, vision_prompt)
            analysis_result = json.loads(response)
            
            # Generate metadata
            metadata = {
                "doc_type": analysis_result["document_type"],
                "processing_date": datetime.utcnow().isoformat(),
                "reference_id": f"doc-{uuid.uuid4().hex[:8]}",
                "extracted_fields": list(analysis_result["fields"].keys()),
                "confidence_score": analysis_result.get("confidence_score", 0.0),
                "searchable_text": self._generate_searchable_text(analysis_result)
            }
            
            return {
                "content": analysis_result,
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error("Error in image analysis: {str(e)}", )
            raise
    
    async def _call_vision_api(self, image_data: bytes, prompt: str) -> str:
        """Call GPT-4 Vision API"""
        try:
            response = await self.vision_model.ainvoke(
                [
                    {
                        "type": "image",
                        "image_data": image_data,
                        "prompt": prompt
                    }
                ]
            )
            return response.content
            
        except Exception as e:
            logger.error("Vision API call failed: {str(e)}", )
            raise
    
    def _generate_searchable_text(self, analysis_result: Dict) -> str:
        """Generate searchable text from analysis result"""
        searchable_parts = [
            analysis_result["document_type"],
            analysis_result["extracted_text"]
        ]
        
        # Add all field values
        for field, value in analysis_result["fields"].items():
            if isinstance(value, (str, int, float)):
                searchable_parts.append(str(value))
            elif isinstance(value, dict):
                searchable_parts.extend(str(v) for v in value.values())
            elif isinstance(value, list):
                searchable_parts.extend(str(v) for v in value)
        
        return " ".join(searchable_parts)
