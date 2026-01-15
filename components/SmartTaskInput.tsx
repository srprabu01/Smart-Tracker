import React, { useState, useRef } from 'react';
import { IconSparkles, IconPlus, IconWaveform } from './Icons.tsx';
import { parseTaskFromInput, transcribeAudio } from '../services/geminiService.ts';
import { Task } from '../types.ts';

interface SmartTaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'streak' | 'lastCompleted'>) => void;
}

const SmartTaskInput: React.FC<SmartTaskInputProps> = ({ onAddTask }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    // Use Gemini to parse
    const parsed = await parseTaskFromInput(input);
    setLoading(false);

    if (parsed) {
      onAddTask({
        ...parsed
      });
      setInput('');
      setIsOpen(false);
    } else {
        alert("Could not parse task with AI. Please try again or check internet.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64String = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          const text = await transcribeAudio(base64String, recorder.mimeType);
          setIsTranscribing(false);
          if (text) {
             setInput(prev => (prev ? prev + " " : "") + text.trim());
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
      >
        <IconPlus className="w-4 h-4" />
        New
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
       <div className="bg-notion-sidebar border border-notion-border rounded-lg shadow-2xl w-full max-w-lg p-6">
          <h2 className="text-lg font-semibold text-notion-text mb-4 flex items-center gap-2">
            <IconSparkles className="w-5 h-5 text-purple-400" />
            Smart Task Creation
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="relative">
                <textarea
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., 'Read 10 pages of a book every night starting today high priority' or use the mic."
                  className="w-full bg-notion-bg border border-notion-border rounded p-3 text-notion-text focus:outline-none focus:border-blue-500 resize-none h-32 mb-4 placeholder-gray-600 pr-10"
                />
                <button
                    type="button"
                    onClick={toggleRecording}
                    className={`absolute bottom-6 right-3 p-2 rounded-full transition-colors ${
                        isRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : isTranscribing 
                            ? 'bg-gray-700 text-gray-400 cursor-wait' 
                            : 'bg-[#2c2c2c] text-gray-400 hover:text-white'
                    }`}
                    title={isRecording ? "Stop recording" : "Transcribe audio"}
                    disabled={isTranscribing}
                >
                    <IconWaveform className="w-4 h-4" />
                </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isRecording || isTranscribing}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Thinking...' : isTranscribing ? 'Transcribing...' : 'Create Task'}
                {!loading && !isTranscribing && <IconSparkles className="w-3 h-3" />}
              </button>
            </div>
          </form>
          <p className="text-xs text-gray-500 mt-4">
            Powered by Gemini. Describe your task naturally, or speak to transcribe.
          </p>
       </div>
    </div>
  );
};

export default SmartTaskInput;