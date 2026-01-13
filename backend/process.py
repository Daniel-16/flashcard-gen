import os
import re
import uuid
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import json

import fitz  # PyMuPDF
import spacy
from sentence_transformers import SentenceTransformer, util
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import numpy as np
from sklearn.cluster import DBSCAN

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Flashcard:
    """Represents a single flashcard"""
    question: str
    answer: str
    card_type: str  # 'definition', 'concept', 'application'
    topic: str
    confidence: float
    source_page: int
    
    def to_dict(self):
        return asdict(self)


@dataclass
class ProcessingJob:
    """Tracks flashcard generation job"""
    job_id: str
    status: str  # 'processing', 'completed', 'failed'
    progress: float
    flashcards: List[Flashcard]
    metadata: Dict
    error: Optional[str] = None


class PDFProcessor:
    """Handles PDF extraction and cleaning"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def extract_text(self, pdf_path: str) -> List[Dict]:
        """Extract text with page numbers and structure"""
        doc = fitz.open(pdf_path)
        pages = []
        
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text")
            # Get text blocks for better structure
            blocks = page.get_text("dict")["blocks"]
            
            pages.append({
                "page_num": page_num,
                "text": text,
                "blocks": blocks,
                "word_count": len(text.split())
            })
        
        doc.close()
        return pages
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        # Remove multiple whitespaces
        text = re.sub(r'\s+', ' ', text)
        # Remove page numbers (common patterns)
        text = re.sub(r'\n\s*\d+\s*\n', '\n', text)
        # Fix hyphenation
        text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text)
        # Remove header/footer artifacts
        text = re.sub(r'^[A-Z\s]+$', '', text, flags=re.MULTILINE)
        
        return text.strip()
    
    def extract_sections(self, pages: List[Dict]) -> List[Dict]:
        """Identify document sections and headings"""
        sections = []
        current_section = {"title": "Introduction", "content": "", "pages": []}
        
        for page in pages:
            text = self.clean_text(page["text"])
            
            # Simple heading detection (size-based from blocks)
            headings = []
            for block in page["blocks"]:
                if block.get("type") == 0:  # Text block
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            if span.get("size", 0) > 12:  # Larger font = heading
                                headings.append(span.get("text", ""))
            
            # If we find a heading, start new section
            if headings and len(headings[0]) < 100:
                if current_section["content"]:
                    sections.append(current_section)
                current_section = {
                    "title": headings[0],
                    "content": text,
                    "pages": [page["page_num"]]
                }
            else:
                current_section["content"] += " " + text
                current_section["pages"].append(page["page_num"])
        
        if current_section["content"]:
            sections.append(current_section)
        
        return sections


class ContentAnalyzer:
    """Analyzes content structure and extracts key concepts"""
    
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def extract_sentences(self, text: str) -> List[str]:
        """Extract clean sentences"""
        doc = self.nlp(text)
        sentences = [sent.text.strip() for sent in doc.sents if len(sent.text.split()) > 5]
        return sentences
    
    def extract_key_concepts(self, text: str) -> List[Dict]:
        """Extract named entities and key phrases"""
        doc = self.nlp(text)
        concepts = []
        
        # Named entities
        for ent in doc.ents:
            if ent.label_ in ["PERSON", "ORG", "GPE", "LAW", "EVENT", "WORK_OF_ART"]:
                concepts.append({
                    "text": ent.text,
                    "type": ent.label_,
                    "context": ent.sent.text
                })
        
        # Noun chunks (technical terms)
        for chunk in doc.noun_chunks:
            if len(chunk.text.split()) >= 2 and chunk.text[0].isupper():
                concepts.append({
                    "text": chunk.text,
                    "type": "TERM",
                    "context": chunk.sent.text
                })
        
        return concepts
    
    def chunk_semantically(self, sentences: List[str], max_chunk_size: int = 5) -> List[List[str]]:
        """Group sentences by semantic similarity"""
        if not sentences:
            return []
        
        embeddings = self.encoder.encode(sentences, convert_to_tensor=True)
        
        # Compute similarity matrix
        similarity_matrix = util.cos_sim(embeddings, embeddings).cpu().numpy()
        
        # Use DBSCAN for clustering
        clustering = DBSCAN(eps=0.3, min_samples=2, metric='precomputed')
        distances = 1 - similarity_matrix
        np.fill_diagonal(distances, 0)
        
        labels = clustering.fit_predict(distances)
        
        # Group sentences by cluster
        chunks = {}
        for idx, label in enumerate(labels):
            if label not in chunks:
                chunks[label] = []
            chunks[label].append(sentences[idx])
        
        # Split large chunks
        final_chunks = []
        for chunk in chunks.values():
            if len(chunk) <= max_chunk_size:
                final_chunks.append(chunk)
            else:
                # Split into smaller chunks
                for i in range(0, len(chunk), max_chunk_size):
                    final_chunks.append(chunk[i:i+max_chunk_size])
        
        return final_chunks


class FlashcardGenerator:
    """Generates flashcards using open-source models"""
    
    def __init__(self, model_name: str = "google/flan-t5-base"):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Loading model: {model_name}")
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        
        self.logger.info("Model loaded successfully")
    
    def generate_definition_card(self, concept: Dict) -> Optional[Flashcard]:
        """Generate definition-style flashcard"""
        prompt = f"What is {concept['text']}? Answer in one clear sentence based on this context: {concept['context']}"
        
        question = f"What is {concept['text']}?"
        answer = self._generate_text(prompt)
        
        if answer and len(answer.split()) > 3:
            return Flashcard(
                question=question,
                answer=answer,
                card_type="definition",
                topic=concept.get('type', 'General'),
                confidence=0.8,
                source_page=0  # To be set by pipeline
            )
        return None
    
    def generate_concept_card(self, chunk: List[str]) -> Optional[Flashcard]:
        """Generate concept-based flashcard from text chunk"""
        context = " ".join(chunk)
        
        # Generate question
        q_prompt = f"Generate a study question based on this text: {context}"
        question = self._generate_text(q_prompt, max_length=64)
        
        if not question or "?" not in question:
            return None
        
        # Generate answer
        a_prompt = f"Answer this question based on the text: {question}\n\nText: {context}"
        answer = self._generate_text(a_prompt, max_length=128)
        
        if answer and len(answer.split()) > 5:
            return Flashcard(
                question=question,
                answer=answer,
                card_type="concept",
                topic="General",
                confidence=0.7,
                source_page=0
            )
        return None
    
    def generate_application_card(self, chunk: List[str]) -> Optional[Flashcard]:
        """Generate application-style flashcard"""
        context = " ".join(chunk)
        
        prompt = f"Create an application question that tests understanding of: {context}"
        question = self._generate_text(prompt, max_length=96)
        
        if question and "?" in question:
            a_prompt = f"Answer: {question}\n\nBased on: {context}"
            answer = self._generate_text(a_prompt, max_length=128)
            
            if answer:
                return Flashcard(
                    question=question,
                    answer=answer,
                    card_type="application",
                    topic="Application",
                    confidence=0.6,
                    source_page=0
                )
        return None
    
    def _generate_text(self, prompt: str, max_length: int = 128) -> str:
        """Generate text using the model"""
        try:
            inputs = self.tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
            outputs = self.model.generate(
                **inputs,
                max_length=max_length,
                num_beams=4,
                temperature=0.7,
                do_sample=True,
                top_p=0.9
            )
            text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            return text.strip()
        except Exception as e:
            self.logger.error(f"Generation error: {e}")
            return ""
    
    def filter_duplicates(self, flashcards: List[Flashcard], threshold: float = 0.85) -> List[Flashcard]:
        """Remove duplicate or very similar flashcards"""
        if not flashcards:
            return []
        
        questions = [fc.question for fc in flashcards]
        embeddings = self.encoder.encode(questions, convert_to_tensor=True)
        
        keep_indices = []
        for i, emb in enumerate(embeddings):
            if i == 0:
                keep_indices.append(i)
                continue
            
            # Compare with all kept flashcards
            similarities = util.cos_sim(emb, embeddings[keep_indices])
            if similarities.max() < threshold:
                keep_indices.append(i)
        
        return [flashcards[i] for i in keep_indices]


class FlashcardPipeline:
    """Orchestrates the entire flashcard generation pipeline"""
    
    def __init__(self):
        self.pdf_processor = PDFProcessor()
        self.content_analyzer = ContentAnalyzer()
        self.flashcard_generator = FlashcardGenerator()
        self.logger = logging.getLogger(self.__class__.__name__)
        
        self.jobs: Dict[str, ProcessingJob] = {}
    
    def create_job(self, pdf_path: str, options: Dict) -> str:
        """Create a new processing job"""
        job_id = str(uuid.uuid4())
        job = ProcessingJob(
            job_id=job_id,
            status="processing",
            progress=0.0,
            flashcards=[],
            metadata={}
        )
        self.jobs[job_id] = job
        
        # Start processing (in production, use background task/queue)
        try:
            self._process_pdf(job_id, pdf_path, options)
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            self.logger.error(f"Job {job_id} failed: {e}")
        
        return job_id
    
    def get_job(self, job_id: str) -> Optional[ProcessingJob]:
        """Get job status"""
        return self.jobs.get(job_id)
    
    def _process_pdf(self, job_id: str, pdf_path: str, options: Dict):
        """Main processing pipeline"""
        job = self.jobs[job_id]
        max_flashcards = options.get("max_flashcards", 50)
        
        try:
            # Step 1: Extract PDF (10%)
            self.logger.info(f"Extracting PDF: {pdf_path}")
            pages = self.pdf_processor.extract_text(pdf_path)
            job.progress = 0.1
            
            # Step 2: Identify sections (20%)
            self.logger.info("Analyzing document structure")
            sections = self.pdf_processor.extract_sections(pages)
            job.progress = 0.2
            
            all_flashcards = []
            
            # Step 3: Process each section (20-80%)
            for idx, section in enumerate(sections):
                progress = 0.2 + (idx / len(sections)) * 0.6
                job.progress = progress
                
                self.logger.info(f"Processing section: {section['title']}")
                
                # Extract sentences
                sentences = self.content_analyzer.extract_sentences(section["content"])
                
                # Extract concepts
                concepts = self.content_analyzer.extract_key_concepts(section["content"])
                
                # Generate definition cards
                for concept in concepts[:5]:  # Limit per section
                    card = self.flashcard_generator.generate_definition_card(concept)
                    if card:
                        card.topic = section["title"]
                        card.source_page = section["pages"][0]
                        all_flashcards.append(card)
                
                # Semantic chunking
                chunks = self.content_analyzer.chunk_semantically(sentences)
                
                # Generate concept cards
                for chunk in chunks[:3]:  # Limit per section
                    card = self.flashcard_generator.generate_concept_card(chunk)
                    if card:
                        card.topic = section["title"]
                        card.source_page = section["pages"][0]
                        all_flashcards.append(card)
            
            # Step 4: Filter and deduplicate (80-90%)
            self.logger.info("Filtering flashcards")
            job.progress = 0.8
            filtered_cards = self.flashcard_generator.filter_duplicates(all_flashcards)
            
            # Sort by confidence and limit
            filtered_cards.sort(key=lambda x: x.confidence, reverse=True)
            final_cards = filtered_cards[:max_flashcards]
            
            # Step 5: Finalize (90-100%)
            job.progress = 0.9
            job.flashcards = final_cards
            job.metadata = {
                "total_cards": len(final_cards),
                "source_pages": len(pages),
                "topics": list(set(card.topic for card in final_cards)),
                "card_types": {
                    "definition": sum(1 for c in final_cards if c.card_type == "definition"),
                    "concept": sum(1 for c in final_cards if c.card_type == "concept"),
                    "application": sum(1 for c in final_cards if c.card_type == "application")
                }
            }
            
            job.status = "completed"
            job.progress = 1.0
            self.logger.info(f"Job {job_id} completed: {len(final_cards)} flashcards generated")
            
        except Exception as e:
            self.logger.error(f"Processing failed: {e}")
            job.status = "failed"
            job.error = str(e)
            raise

