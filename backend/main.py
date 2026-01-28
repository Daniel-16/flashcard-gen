import asyncio
import os
import numpy as np
import spacy
import fitz
import torch
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
GEN_BATCH_SIZE = 16  # tune down if OOM on GPU

def _device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


class AIResources:
    nlp = None
    tokenizer = None
    model = None
    embedder = None
    device = "cpu"


resources = AIResources()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading AI Models...")
    resources.device = _device()
    print(f"✓ Using device: {resources.device}")
    try:
        try:
            resources.nlp = spacy.load(SPACY_MODEL)
            print(f"✓ spaCy model loaded: {SPACY_MODEL}")
        except OSError:
            import en_core_web_sm
            resources.nlp = en_core_web_sm.load()
            print(f"✓ spaCy model loaded from package")
        # Faster NLP: keep only tok2vec, parser, ner (sents, ents, noun_chunks)
        try:
            resources.nlp.select_pipes(enable=["tok2vec", "parser", "ner"])
        except Exception:
            pass
    except Exception as e:
        print(f"✗ Failed to load spaCy: {e}")
        raise

    resources.tokenizer = AutoTokenizer.from_pretrained(GEN_MODEL_NAME)
    if resources.tokenizer.pad_token_id is None:
        resources.tokenizer.pad_token_id = resources.tokenizer.eos_token_id
    print("✓ Tokenizer loaded")

    resources.model = AutoModelForSeq2SeqLM.from_pretrained(GEN_MODEL_NAME)
    resources.model = resources.model.to(resources.device)
    if resources.device == "cuda":
        resources.model = resources.model.half()
    resources.model.eval()
    print(f"✓ Generation model loaded on {resources.device}")

    resources.embedder = SentenceTransformer(EMBED_MODEL_NAME, device=resources.device)
    print("✓ Embedder loaded")

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
    parts = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(parts)

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

def _generate_questions_batch(contexts: List[str], answers: List[str]) -> List[str]:
    """Generate questions in batches for much faster throughput."""
    if not contexts:
        return []
    prompts = [
        f"generate question: context: {c} answer: {a}"
        for c, a in zip(contexts, answers)
    ]
    all_questions: List[str] = []
    for i in range(0, len(prompts), GEN_BATCH_SIZE):
        batch = prompts[i : i + GEN_BATCH_SIZE]
        inputs = resources.tokenizer(
            batch,
            return_tensors="pt",
            max_length=512,
            truncation=True,
            padding=True,
            return_attention_mask=True,
        )
        inputs = {k: v.to(resources.device) for k, v in inputs.items()}
        with torch.inference_mode():
            outputs = resources.model.generate(
                **inputs,
                max_new_tokens=48,
                num_beams=1,
                do_sample=False,
                pad_token_id=resources.tokenizer.pad_token_id or resources.tokenizer.eos_token_id,
            )
        questions = resources.tokenizer.batch_decode(outputs, skip_special_tokens=True)
        all_questions.extend(q.strip() for q in questions)
    return all_questions

def deduplicate_flashcards(cards: List[Flashcard], threshold: float = 0.80) -> List[Flashcard]:
    if not cards:
        return []
    questions = [card.question for card in cards]
    embeddings = resources.embedder.encode(
        questions, batch_size=64, show_progress_bar=False, convert_to_numpy=True
    )
    
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

def _run_generation(raw_text: str, filename: str) -> FlashcardResponse:
    """CPU/GPU-bound work; run in thread pool to avoid blocking the event loop."""
    candidates = extract_candidate_sentences(raw_text)[:50]
    if not candidates:
        return FlashcardResponse(filename=filename, count=0, flashcards=[])
    contexts = [c[0] for c in candidates]
    answers = [c[1] for c in candidates]
    print(f"Generating questions for {len(candidates)} valid sentences (batched)...")
    questions = _generate_questions_batch(contexts, answers)
    generated_cards = []
    for (context, answer), question in zip(candidates, questions):
        if "?" in question:
            generated_cards.append(
                Flashcard(question=question, answer=answer, explanation=context)
            )
    final_cards = deduplicate_flashcards(generated_cards)
    return FlashcardResponse(filename=filename, count=len(final_cards), flashcards=final_cards)


@app.post("/generate", response_model=FlashcardResponse)
async def generate_flashcards(file: UploadFile = File(...)):
    temp_filename = f"temp_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        buffer.write(await file.read())

    try:
        raw_text = extract_text_from_pdf(temp_filename)
        return await asyncio.to_thread(_run_generation, raw_text, file.filename)
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

@app.get("/health")
def health():
    return {"status": "ready"}