"use client"
import React, { useState, ChangeEvent, useEffect } from 'react';
import { Upload, BookOpen, Sparkles, CheckCircle, XCircle, RotateCcw, Zap, Brain } from 'lucide-react';

interface Flashcard {
  question: string;
  answer: string;
  explanation: string;
}

interface FlashcardResponse {
  filename: string;
  count: number;
  flashcards: Flashcard[];
}

const FlashcardGenerator: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 200);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [loading]);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Please drop a valid PDF file');
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid PDF file');
      setFile(null);
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (!file) return;

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to generate flashcards');

      const data: FlashcardResponse = await response.json();
      setProgress(100);
      setTimeout(() => {
        setFlashcards(data.flashcards);
        setShowResults(true);
        setCurrentIndex(0);
        setFlipped(false);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleFlip = (): void => setFlipped(!flipped);

  const handleNext = (): void => {
    if (currentIndex < flashcards.length - 1) {
      setFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
    }
  };

  const handlePrev = (): void => {
    if (currentIndex > 0) {
      setFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
    }
  };

  const handleReset = (): void => {
    setFile(null);
    setFlashcards([]);
    setShowResults(false);
    setCurrentIndex(0);
    setFlipped(false);
    setError('');
  };

  const currentCard: Flashcard | undefined = flashcards[currentIndex];

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse-slow"></div>
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-64 h-64 bg-pink-500/20 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-down">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <Brain className="w-14 h-14 text-purple-400 animate-pulse-glow" />
              <div className="absolute inset-0 bg-purple-400/20 blur-xl rounded-full animate-pulse-glow"></div>
            </div>
            <h1 className="text-6xl font-black bg-linear-to-br from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
              FlashGenius
            </h1>
          </div>
          <p className="text-slate-300 text-xl font-light tracking-wide">
            Transform documents into <span className="text-purple-400 font-semibold">intelligent</span> study cards
          </p>
        </div>

        {!showResults ? (
          /* Upload Section */
          <div className="animate-scale-in">
            <div 
              className={`backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl p-10 border border-white/20 transition-all duration-300 ${
                dragActive ? 'border-purple-400 bg-white/20 scale-105' : ''
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider">
                  Upload PDF Document
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    disabled={loading}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`flex flex-col items-center justify-center gap-4 w-full p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-500 ${
                      file
                        ? 'border-purple-400 bg-purple-500/20 scale-105'
                        : 'border-slate-500 hover:border-purple-400 hover:bg-white/5'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${
                      dragActive ? 'border-purple-400 bg-purple-500/20 scale-105' : ''
                    }`}
                  >
                    <div className="relative">
                      <Upload className={`w-16 h-16 transition-all duration-500 ${
                        file ? 'text-purple-400 scale-110' : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                      }`} />
                      {file && (
                        <div className="absolute inset-0 bg-purple-400/20 blur-xl rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <div className="text-center">
                      <span className={`text-lg font-semibold block mb-2 ${
                        file ? 'text-purple-300' : 'text-slate-300'
                      }`}>
                        {file ? file.name : 'Drop your PDF here or click to browse'}
                      </span>
                      <span className="text-sm text-slate-400">
                        {file ? 'Ready to generate flashcards' : 'Supports PDF files up to 50MB'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-5 mb-8 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 animate-shake backdrop-blur-sm">
                  <XCircle className="w-6 h-6 shrink-0 animate-pulse" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {loading && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-300">Generating flashcards...</span>
                    <span className="text-sm font-bold text-purple-400">{progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className="h-full bg-linear-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full transition-all duration-300 animate-gradient"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className={`w-full py-5 rounded-xl font-bold text-lg text-white transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group ${
                  !file || loading
                    ? 'bg-slate-700 cursor-not-allowed opacity-50'
                    : 'bg-linear-to-br from-purple-600 via-pink-600 to-blue-600 hover:shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105'
                }`}
              >
                <div className="absolute inset-0 bg-linear-to-br from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Your Document...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    <span>Generate Smart Flashcards</span>
                    <Sparkles className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Flashcard Display */
          <div className="animate-fade-in-up">
            {/* Stats Bar */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 mb-8 flex items-center justify-between border border-white/20 animate-slide-in-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Generated Successfully</p>
                  <p className="text-lg font-bold text-white">{flashcards.length} Flashcards</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white hover:text-purple-300 hover:bg-white/10 rounded-xl transition-all duration-300 border border-white/20 hover:border-purple-400 group"
              >
                <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                New Document
              </button>
            </div>

            {/* Flashcard */}
            {currentCard && (
              <div className="perspective-2000 mb-10">
                <div
                  className={`relative h-128 cursor-pointer transition-all duration-700 transform-style-3d ${
                    flipped ? 'rotate-y-180' : ''
                  } hover:scale-105`}
                  onClick={handleFlip}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden">
                    <div className="h-auto bg-linear-to-br from-purple-600 via-pink-600 to-blue-600 rounded-3xl shadow-2xl shadow-purple-500/50 p-10 flex flex-col justify-between border-4 border-white/30 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                          <Sparkles className="w-4 h-4 text-purple-200" />
                          <span className="text-sm font-bold text-white">QUESTION</span>
                        </div>
                        <span className="text-sm font-bold text-white bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                          {currentIndex + 1} / {flashcards.length}
                        </span>
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center relative z-10 px-6">
                        <p className="text-3xl font-bold text-white text-center leading-relaxed drop-shadow-lg">
                          {currentCard.question}
                        </p>
                      </div>
                      
                      <div className="text-center relative z-10">
                        <p className="text-sm text-purple-100 font-medium mb-2">Click to reveal answer</p>
                        <div className="flex justify-center gap-2">
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180">
                    <div className="h-auto backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl shadow-blue-500/30 p-10 flex flex-col justify-between border-4 border-purple-400 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-linear-to-br from-purple-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full">
                          <CheckCircle className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-bold text-purple-600">ANSWER</span>
                        </div>
                        <span className="text-sm font-bold text-purple-600 bg-purple-100 px-4 py-2 rounded-full">
                          {currentIndex + 1} / {flashcards.length}
                        </span>
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center gap-6 relative z-10">
                        <div className="bg-linear-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
                          <p className="text-2xl font-black text-transparent bg-linear-to-br from-purple-600 to-blue-600 bg-clip-text">
                            {currentCard.answer}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                          <p className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-purple-600" />
                            Detailed Explanation
                          </p>
                          <p className="text-slate-700 leading-relaxed">{currentCard.explanation}</p>
                        </div>
                      </div>
                      
                      <p className="text-center text-sm text-slate-500 font-medium relative z-10">Click to see question again</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 animate-slide-in-bottom">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`px-8 py-1 rounded-xl font-bold transition-all duration-300 ${
                  currentIndex === 0
                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                    : 'backdrop-blur-xl bg-white/10 text-white hover:bg-white/20 shadow-lg hover:shadow-xl border border-white/20 hover:border-white/40 hover:scale-110'
                }`}
              >
                ← Previous
              </button>
              
              <div className="flex gap-3 px-6 py-2 backdrop-blur-xl bg-white/10 rounded-full border border-white/20">
                {flashcards.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-3 rounded-full transition-all duration-500 ${
                      idx === currentIndex
                        ? 'w-12 bg-linear-to-br from-purple-400 to-pink-400 shadow-lg shadow-purple-500/50'
                        : idx < currentIndex
                        ? 'w-3 bg-green-400'
                        : 'w-3 bg-slate-500'
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={handleNext}
                disabled={currentIndex === flashcards.length - 1}
                className={`px-8 py-1 rounded-xl font-bold transition-all duration-300 ${
                  currentIndex === flashcards.length - 1
                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                    : 'bg-linear-to-br from-purple-600 to-pink-600 text-white hover:shadow-xl hover:shadow-purple-500/50 border border-white/20 hover:scale-110'
                }`}
              >
                → Next
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slide-in-bottom {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          75% {
            transform: translateY(20px) translateX(-10px);
          }
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.6s ease-out;
        }

        .animate-slide-in-left {
          animation: slide-in-left 0.6s ease-out;
        }

        .animate-slide-in-bottom {
          animation: slide-in-bottom 0.6s ease-out 0.3s both;
        }

        .animate-shake {
          animation: shake 0.5s ease-out;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-float {
          animation: float 15s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .perspective-2000 {
          perspective: 2000px;
        }

        .transform-style-3d {
          transform-style: preserve-3d;
        }

        .backface-hidden {
          backface-visibility: hidden;
        }

        .rotate-y-180 {
          transform: rotateY(180deg);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default FlashcardGenerator;