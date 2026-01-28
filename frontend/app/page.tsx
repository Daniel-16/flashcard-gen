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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] bg-linear-to-br from-purple-200/40 via-pink-200/30 to-blue-200/40 rounded-full blur-3xl -top-64 -left-64 animate-orb-float"></div>
        <div className="absolute w-[500px] h-[500px] bg-linear-to-br from-blue-200/40 via-cyan-200/30 to-purple-200/40 rounded-full blur-3xl -bottom-64 -right-64 animate-orb-float-delayed"></div>
        <div className="absolute w-[400px] h-[400px] bg-linear-to-br from-pink-200/30 via-purple-200/30 to-blue-200/30 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-orb-pulse"></div>
      </div>

      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={`absolute ${i % 3 === 0 ? 'w-2 h-2' : i % 3 === 1 ? 'w-3 h-3' : 'w-1.5 h-1.5'} bg-linear-to-br from-purple-400/20 to-blue-400/20 rounded-full animate-float-gentle`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 12}s`
            }}
          />
        ))}
        {[...Array(8)].map((_, i) => (
          <div
            key={`shape-${i}`}
            className="absolute w-16 h-16 border-2 border-purple-300/20 rounded-lg animate-rotate-slow"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${20 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-down">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-linear-to-br from-purple-400/30 via-pink-400/30 to-blue-400/30 blur-2xl rounded-full animate-pulse-glow scale-150"></div>
              <Brain className="w-16 h-16 text-purple-600 relative z-10 animate-bounce-gentle group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-linear-to-br from-purple-400/20 to-blue-400/20 blur-xl rounded-full animate-pulse-glow"></div>
            </div>
            <h1 className="text-7xl font-black bg-linear-to-br from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent animate-gradient-shimmer drop-shadow-sm">
              FlashGenius
            </h1>
          </div>
          <p className="text-slate-700 text-xl font-light tracking-wide">
            Transform documents into <span className="font-semibold bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">intelligent</span> study cards
          </p>
        </div>

        {!showResults ? (
          /* Upload Section */
          <div className="min-h-screen animate-scale-in">
            <div 
              className={`backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-10 border border-purple-200/50 transition-all duration-500 hover:shadow-purple-200/50 ${
                dragActive ? 'border-purple-500 bg-purple-50/80 scale-[1.02] shadow-purple-300/50' : ''
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">
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
                    className={`flex flex-col items-center justify-center gap-4 w-full p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-500 bg-linear-to-br ${
                      file
                        ? 'border-purple-500 bg-linear-to-br from-purple-50 to-blue-50 scale-[1.02] shadow-lg shadow-purple-200/50'
                        : 'border-slate-300 hover:border-purple-400 hover:bg-linear-to-br hover:from-purple-50/50 hover:to-blue-50/50 hover:shadow-md'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${
                      dragActive ? 'border-purple-500 bg-linear-to-br from-purple-50 to-blue-50 scale-[1.02] shadow-lg shadow-purple-200/50' : ''
                    }`}
                  >
                    <div className="relative">
                      <Upload className={`w-16 h-16 transition-all duration-500 ${
                        file ? 'text-purple-600 scale-110 animate-bounce-gentle' : 'text-slate-400 group-hover:text-purple-600 group-hover:scale-110 group-hover:rotate-12'
                      }`} />
                      {file && (
                        <div className="absolute inset-0 bg-purple-400/30 blur-2xl rounded-full animate-pulse scale-150"></div>
                      )}
                    </div>
                    <div className="text-center">
                      <span className={`text-lg font-semibold block mb-2 transition-colors ${
                        file ? 'text-purple-700' : 'text-slate-700'
                      }`}>
                        {file ? file.name : 'Drop your PDF here or click to browse'}
                      </span>
                      <span className="text-sm text-slate-500">
                        {file ? 'Ready to generate flashcards' : 'Supports PDF files up to 50MB'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-5 mb-8 bg-red-50 border-2 border-red-300 rounded-xl text-red-700 animate-shake backdrop-blur-sm shadow-md">
                  <XCircle className="w-6 h-6 shrink-0 animate-pulse text-red-500" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {loading && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Generating flashcards...</span>
                    <span className="text-sm font-bold text-purple-600">{progress}%</span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-linear-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full transition-all duration-300 animate-gradient-shimmer relative overflow-hidden"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className={`w-full py-5 rounded-xl font-bold text-lg text-white transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group ${
                  !file || loading
                    ? 'bg-slate-300 cursor-not-allowed opacity-50'
                    : 'bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 hover:shadow-2xl hover:shadow-purple-400/60 transform hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Your Document...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6 group-hover:animate-pulse" />
                    <span>Generate Smart Flashcards</span>
                    <Sparkles className="w-5 h-5 group-hover:animate-spin-slow" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Flashcard Display */
          <div className="animate-fade-in-up">
            {/* Stats Bar */}
            <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl p-6 mb-8 flex items-center justify-between border border-purple-200/50 animate-slide-in-left hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-linear-to-br from-green-100 to-emerald-100 rounded-xl shadow-md">
                  <CheckCircle className="w-6 h-6 text-green-600 animate-scale-in" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Generated Successfully</p>
                  <p className="text-lg font-bold text-slate-800">{flashcards.length} Flashcards</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-700 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-300 border border-slate-200 hover:border-purple-300 group shadow-sm hover:shadow-md"
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
                  } hover:scale-[1.02]`}
                  onClick={handleFlip}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden">
                    <div className="h-auto bg-linear-to-br from-purple-500 via-pink-500 to-blue-500 rounded-3xl shadow-2xl shadow-purple-400/40 p-10 flex flex-col justify-between border-4 border-white/50 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-linear-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-2 bg-white/30 px-4 py-2 rounded-full backdrop-blur-md shadow-md">
                          <Sparkles className="w-4 h-4 text-purple-700 animate-pulse" />
                          <span className="text-sm font-bold text-slate-800">QUESTION</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800 bg-white/30 px-4 py-2 rounded-full backdrop-blur-md shadow-md">
                          {currentIndex + 1} / {flashcards.length}
                        </span>
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center relative z-10 px-6">
                        <p className="text-3xl font-bold text-white text-center leading-relaxed drop-shadow-lg">
                          {currentCard.question}
                        </p>
                      </div>
                      
                      <div className="text-center relative z-10">
                        <p className="text-sm text-white/90 font-medium mb-2">Click to reveal answer</p>
                        <div className="flex justify-center gap-2">
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180">
                    <div className="h-auto bg-white rounded-3xl shadow-2xl shadow-blue-200/50 p-10 flex flex-col justify-between border-4 border-purple-300 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-linear-to-br from-purple-50/80 to-blue-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-2 bg-linear-to-br from-purple-100 to-blue-100 px-4 py-2 rounded-full shadow-sm">
                          <CheckCircle className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-bold text-purple-700">ANSWER</span>
                        </div>
                        <span className="text-sm font-bold text-purple-700 bg-linear-to-br from-purple-100 to-blue-100 px-4 py-2 rounded-full shadow-sm">
                          {currentIndex + 1} / {flashcards.length}
                        </span>
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center gap-6 relative z-10">
                        <div className="bg-linear-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                          <p className="text-2xl font-black text-transparent bg-linear-to-br from-purple-600 to-blue-600 bg-clip-text">
                            {currentCard.answer}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-300">
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
                className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                  currentIndex === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-700 shadow-lg hover:shadow-xl border border-slate-200 hover:border-purple-300 hover:scale-105 active:scale-95'
                }`}
              >
                ← Previous
              </button>
              
              <div className="flex gap-2 px-6 py-3 bg-white/90 backdrop-blur-xl rounded-full border border-purple-200/50 shadow-lg">
                {flashcards.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-3 rounded-full transition-all duration-500 ${
                      idx === currentIndex
                        ? 'w-12 bg-linear-to-r from-purple-500 to-pink-500 shadow-md shadow-purple-400/50 animate-pulse-gentle'
                        : idx < currentIndex
                        ? 'w-3 bg-green-400 hover:bg-green-500'
                        : 'w-3 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={handleNext}
                disabled={currentIndex === flashcards.length - 1}
                className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                  currentIndex === flashcards.length - 1
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-linear-to-r from-purple-600 to-pink-600 text-white hover:shadow-xl hover:shadow-purple-400/60 border border-purple-300 hover:scale-105 active:scale-95'
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

        @keyframes orb-float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.4;
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
            opacity: 0.5;
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
            opacity: 0.3;
          }
        }

        @keyframes orb-float-delayed {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          33% {
            transform: translate(-40px, 40px) scale(1.15);
            opacity: 0.5;
          }
          66% {
            transform: translate(30px, -30px) scale(0.85);
            opacity: 0.2;
          }
        }

        @keyframes orb-pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.4;
          }
        }

        @keyframes float-gentle {
          0%, 100% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-30px) translateX(15px) rotate(90deg);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-20px) translateX(-10px) rotate(180deg);
            opacity: 0.4;
          }
          75% {
            transform: translateY(30px) translateX(-15px) rotate(270deg);
            opacity: 0.5;
          }
        }

        @keyframes rotate-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes gradient-shimmer {
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

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-gentle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
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

        .animate-orb-float {
          animation: orb-float 20s ease-in-out infinite;
        }

        .animate-orb-float-delayed {
          animation: orb-float-delayed 25s ease-in-out infinite;
        }

        .animate-orb-pulse {
          animation: orb-pulse 15s ease-in-out infinite;
        }

        .animate-float-gentle {
          animation: float-gentle 20s ease-in-out infinite;
        }

        .animate-rotate-slow {
          animation: rotate-slow 30s linear infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }

        .animate-gradient-shimmer {
          background-size: 200% 200%;
          animation: gradient-shimmer 3s ease infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-pulse-gentle {
          animation: pulse-gentle 2s ease-in-out infinite;
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