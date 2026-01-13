# FlashGenius - AI-Powered Flashcard Generator

## Overview

FlashGenius is an intelligent flashcard generation system that transforms PDF documents into study-ready flashcards using advanced natural language processing and machine learning techniques. The system leverages state-of-the-art language models to automatically extract key concepts and generate meaningful question-answer pairs from document content.

## System Architecture

### Backend Architecture

The backend is built on FastAPI and implements a robust processing pipeline:

- **Text Extraction Engine**: Utilizes PyMuPDF (Fitz) for reliable PDF text extraction with page-by-page processing
- **Natural Language Processing**: Implements spaCy for named entity recognition and sentence parsing
- **Question Generation**: Integrates Google FLAN-T5 model for context-based question generation
- **Semantic Analysis**: Uses Sentence Transformers for similarity detection and deduplication
- **REST API Layer**: FastAPI framework with automatic OpenAPI documentation generation

### Frontend Architecture

The frontend follows modern React patterns with Next.js:

- **React 19**: Leverages latest React features including concurrent rendering
- **TypeScript**: Provides type safety and improved developer experience
- **Tailwind CSS**: Utility-first CSS framework for maintainable styling
- **Component Architecture**: Modular design with reusable components
- **Responsive Design**: Mobile-first approach with adaptive layouts

## Technology Stack

### Backend Dependencies

- Python 3.12+
- FastAPI - Modern web framework for building APIs
- spaCy - Industrial-strength natural language processing
- Transformers - Hugging Face transformers library
- Sentence Transformers - Semantic similarity computation
- PyMuPDF - PDF document processing
- NumPy - Numerical computing
- scikit-learn - Machine learning utilities

### Frontend Dependencies

- Next.js 16 - React framework with App Router
- React 19 - UI library with latest features
- TypeScript - Static type checking
- Tailwind CSS 4 - Utility-first styling
- Lucide React - Icon library

## System Requirements

### Backend Requirements

- Python 3.12 or higher
- 4GB RAM minimum (8GB recommended for optimal performance)
- 2GB disk space for models and dependencies

### Frontend Requirements

- Node.js 18 or higher
- npm or yarn package manager
- Modern web browser with ES6+ support

## Installation Instructions

### Backend Installation

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install Python dependencies using uv:

```bash
uv sync
```

3. Download the required spaCy language model:

```bash
python -m spacy download en_core_web_sm
```

4. Start the development server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API server will be accessible at `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.

### Frontend Installation

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install Node.js dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The web application will be accessible at `http://localhost:3000`.

## Usage Guide

### Basic Workflow

1. Access the web application through your browser
2. Upload a PDF document using the drag-and-drop interface or file selector
3. Monitor the processing progress as the system analyzes the document
4. Review generated flashcards with question-answer pairs
5. Navigate through cards using the provided controls
6. Study by flipping cards to reveal answers

### API Integration

The backend provides a RESTful API for programmatic access to flashcard generation capabilities.

## API Reference

### Flashcard Generation Endpoint

**Endpoint**: `POST /generate`

**Description**: Generates flashcards from an uploaded PDF document.

**Request**:
- Method: POST
- Content-Type: multipart/form-data
- Parameters:
  - `file`: PDF file (required)

**Response**:

```json
{
  "filename": "document.pdf",
  "count": 15,
  "flashcards": [
    {
      "question": "What is the capital of France?",
      "answer": "Paris",
      "explanation": "Paris is the capital and most populous city of France."
    }
  ]
}
```

**Status Codes**:
- 200: Successful generation
- 400: Invalid file format or corrupted PDF
- 500: Internal server error

### Health Check Endpoint

**Endpoint**: `GET /health`

**Description**: Returns the operational status of the API server.

**Response**:

```json
{
  "status": "ready"
}
```

**Status Codes**:
- 200: Service operational

## Machine Learning Models

### spaCy Language Model

- **Model**: en_core_web_sm
- **Purpose**: Named entity recognition and sentence segmentation
- **Size**: Approximately 12MB

### Question Generation Model

- **Model**: Google FLAN-T5 Base
- **Purpose**: Context-based question generation
- **Size**: Approximately 850MB

### Semantic Similarity Model

- **Model**: all-MiniLM-L6-v2
- **Purpose**: Semantic similarity computation for deduplication
- **Size**: Approximately 80MB

## Processing Pipeline

The system implements a multi-stage processing pipeline:

1. **Text Extraction**: PDF content is extracted page by page using PyMuPDF
2. **Sentence Analysis**: spaCy identifies candidate sentences and extracts named entities
3. **Question Generation**: FLAN-T5 generates questions based on extracted context
4. **Quality Filtering**: Validates generated questions for meaningfulness and structure
5. **Deduplication**: Removes semantically similar questions using cosine similarity
6. **Response Formatting**: Structures data into standardized flashcard format

## Frontend Features

### Core Functionality

- Drag-and-drop file upload interface
- Real-time processing progress indicators
- Interactive card flipping with 3D animations
- Keyboard navigation support
- Responsive layout adapting to screen size

### User Interface

- Dark theme with gradient accents
- Smooth transitions and animations
- Loading states and error handling
- Accessibility-compliant controls

## Project Structure

```
flashcard/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── process.py           # Advanced PDF processing module
│   ├── pyproject.toml       # Python dependency specifications
│   └── README.md            # Backend-specific documentation
├── frontend/
│   ├── app/
│   │   ├── layout.tsx       # Application root layout
│   │   ├── page.tsx         # Main flashcard interface
│   │   └── globals.css      # Global styling definitions
│   ├── package.json         # Node.js dependency specifications
│   ├── next.config.ts       # Next.js configuration
│   └── README.md            # Frontend-specific documentation
└── README.md                # Project overview documentation
```

## Configuration

### Backend Configuration

The backend can be configured through environment variables:

- `HOST`: Server host address (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)
- `RELOAD`: Enable auto-reload in development (default: true)

### Frontend Configuration

Configuration is managed through `next.config.ts`:

- API endpoint configuration
- Build optimization settings
- Environment-specific variables

## Performance Considerations

- Initial model loading may take 10-20 seconds on first request
- Processing time scales with PDF size (typically 30-60 seconds per document)
- Memory usage peaks during model inference
- Concurrent request handling is supported but may impact performance

## Error Handling

The system implements comprehensive error handling:

- Invalid file format detection
- PDF parsing error recovery
- Model inference failure handling
- Network error management
- User-friendly error messages

## Security Considerations

- File size limits enforced on uploads
- PDF content validation before processing
- CORS configuration for API access
- Input sanitization for generated content

## Development Guidelines

### Contributing

1. Fork the repository
2. Create a feature branch from main
3. Implement changes with appropriate tests
4. Ensure code passes linting and type checks
5. Submit a pull request with detailed description

### Code Style

- Python: Follow PEP 8 guidelines
- TypeScript: Follow Airbnb style guide
- Use meaningful variable and function names
- Include docstrings for functions and classes
- Write self-documenting code

## License

This project is licensed under the MIT License. See the LICENSE file for complete terms and conditions.

## Acknowledgments

This project builds upon several open-source technologies:

- Hugging Face for transformer model infrastructure
- spaCy for natural language processing capabilities
- FastAPI for high-performance web framework
- Next.js for React application framework
- Tailwind CSS for utility-first styling approach