import os
import numpy as np
import spacy
import fitz
from typing import List, Tuple
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from sentence_transformers import SentenceTransformer

SPACY_MODEL = "en_core_web_sm"
GEN_MODEL_NAME = "google/flan-t5-base" 
EMBED_MODEL_NAME = "all-MiniLM-L6-v2" 

class AIResources:
    nlp = None
    tokenizer = None
    model = None
    embedder = None

resources = AIResources()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading AI Models...")
    try:
        try:
            resources.nlp = spacy.load(SPACY_MODEL)
            print(f"✓ spaCy model loaded: {SPACY_MODEL}")
        except OSError:
            import en_core_web_sm
            resources.nlp = en_core_web_sm.load()
            print(f"✓ spaCy model loaded from package")
    except Exception as e:
        print(f"✗ Failed to load spaCy: {e}")
        raise
    
    resources.tokenizer = AutoTokenizer.from_pretrained(GEN_MODEL_NAME)
    print(f"✓ Tokenizer loaded")
    
    resources.model = AutoModelForSeq2SeqLM.from_pretrained(GEN_MODEL_NAME)
    print(f"✓ Generation model loaded")
    
    resources.embedder = SentenceTransformer(EMBED_MODEL_NAME)
    print(f"✓ Embedder loaded")
    
    print("All models loaded successfully!")
    yield
    resources.nlp = None
    resources.tokenizer = None
    resources.model = None
    resources.embedder = None

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Flashcard(BaseModel):
    question: str
    answer: str
    explanation: str

class FlashcardResponse(BaseModel):
    filename: str
    count: int
    flashcards: List[Flashcard]


def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_candidate_sentences(text: str) -> List[Tuple[str, str]]:
    """
    Finds sentences and identifies the KEY subject (Entity).
    Filters out vague subjects like 'It', 'This', 'They'.
    """
    doc = resources.nlp(text)
    candidates = []

    for sent in doc.sents:
        sent_text = sent.text.strip()
        
        if len(sent_text) < 30 or len(sent_text) > 300:
            continue

        ents = sent.ents
        focus_text = ""
        
        if ents:
            focus_text = max([e.text for e in ents], key=len)
        else:
            chunks = list(sent.noun_chunks)
            if not chunks:
                continue
            
            first_chunk = chunks[0]
            if first_chunk.root.pos_ == "PRON":
                continue
                
            focus_text = first_chunk.text

        if focus_text.lower() in ["it", "this", "that", "these", "those", "chapter", "section"]:
            continue

        candidates.append((sent_text, focus_text))

    return candidates

def generate_question(context: str, answer: str) -> str:
    input_text = f"generate question: context: {context} answer: {answer}"
    
    inputs = resources.tokenizer(
        input_text, 
        return_tensors="pt", 
        max_length=512, 
        truncation=True
    )

    outputs = resources.model.generate(
        **inputs, 
        max_length=64, 
        num_beams=4, 
        early_stopping=True
    )
    
    question = resources.tokenizer.decode(outputs[0], skip_special_tokens=True)
    return question

def deduplicate_flashcards(cards: List[Flashcard], threshold: float = 0.80) -> List[Flashcard]:
    if not cards:
        return []
    
    # We allow similar answers, but not similar QUESTIONS
    questions = [card.question for card in cards]
    embeddings = resources.embedder.encode(questions)
    
    # Calculate similarity
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    normalized = embeddings / norms
    similarity_matrix = np.dot(normalized, normalized.T)
    
    unique_cards = []
    dropped_indices = set()

    for i in range(len(cards)):
        if i in dropped_indices:
            continue
        unique_cards.append(cards[i])
        for j in range(i + 1, len(cards)):
            if similarity_matrix[i][j] > threshold:
                dropped_indices.add(j)
                
    return unique_cards

# --- API Endpoints ---

@app.post("/generate", response_model=FlashcardResponse)
async def generate_flashcards(file: UploadFile = File(...)):
    temp_filename = f"temp_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        buffer.write(await file.read())

    try:
        raw_text = extract_text_from_pdf(temp_filename)
        
        # Analyze and get Candidates
        # Increased limit to 50 for better variety
        candidates = extract_candidate_sentences(raw_text)[:50]
        
        generated_cards = []
        
        print(f"Generating questions for {len(candidates)} valid sentences...")
        
        for context, answer in candidates:
            question = generate_question(context, answer)
            
            # Quality Check: Question must contain a question word or ?
            if "?" in question:
                generated_cards.append(Flashcard(
                    question=question,
                    answer=answer,      # The short term
                    explanation=context # The full "answer" derived from text
                ))
        
        final_cards = deduplicate_flashcards(generated_cards)

        return FlashcardResponse(
            filename=file.filename,
            count=len(final_cards),
            flashcards=final_cards
        )

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

@app.get("/health")
def health():
    return {"status": "ready"}