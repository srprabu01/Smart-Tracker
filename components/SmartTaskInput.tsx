import React, { useState, useRef } from 'react';
import { IconSparkles, IconPlus, IconWaveform } from './Icons.tsx';
import { parseTaskFromInput, transcribeAudio } from '../services/geminiService.ts';
import { Task } from '../types.ts';

interface SmartTaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'uid' | 'streak' | 'lastCompleted'>) => void;
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
    try {
        const parsed = await parseTaskFromInput(input);
        setLoading(false);

        if (parsed) {
          onAddTask({
            ...parsed
          });
          setInput('');
          setIsOpen(false);
        } else {
            alert("Could not parse task with AI. Please try again or check if you've set your Gemini API key in the settings.");
        }
    } catch (e) {
        setLoading(false);
        console.error("SmartTaskInput error:", e);
        alert("An error occurred while connecting to the AI. Please check your internet connection or API key.");
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
        className="flex items-center gap-2 bg-app-purple-600 hover:bg-app-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-app-purple-100 active:scale-95"
      >
        <IconPlus className="w-4 h-4" />
        Commit Action
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-app-ink/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
       <div className="bg-white border border-app-border rounded-[2rem] shadow-2xl w-full max-w-lg p-8 animate-in zoom-in slide-in-from-bottom-8 duration-500">
          <h2 className="text-2xl font-black text-app-ink mb-6 flex items-center gap-3 font-display">
            <IconSparkles className="w-6 h-6 text-app-purple-500" />
            Neural Engine
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="relative">
                <textarea
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., 'Synchronize neural link with glute development phase 1 starting 0800 hours'"
                  className="w-full bg-app-surface border border-app-border rounded-2xl p-4 text-app-ink focus:outline-none focus:border-app-purple-400 focus:ring-4 focus:ring-app-purple-50 resize-none h-40 mb-6 placeholder-app-muted font-bold transition-all pr-12"
                />
                <button
                    type="button"
                    onClick={toggleRecording}
                    className={`absolute bottom-10 right-4 p-3 rounded-xl transition-all shadow-lg ${
                        isRecording 
                        ? 'bg-rose-500 text-white animate-pulse scale-110 shadow-rose-200' 
                        : isTranscribing 
                            ? 'bg-slate-100 text-app-muted cursor-wait' 
                            : 'bg-white text-app-muted hover:text-app-purple-500 border border-app-border shadow-sm'
                    }`}
                    title={isRecording ? "Stop Capture" : "Audio Synthesis"}
                    disabled={isTranscribing}
                >
                    <IconWaveform className="w-4 h-4" />
                </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-6 py-3 text-xs font-black uppercase tracking-widest text-app-muted hover:text-app-ink transition-colors"
              >
                Abort
              </button>
              <button
                type="submit"
                disabled={loading || isRecording || isTranscribing}
                className="flex items-center gap-3 bg-app-purple-600 hover:bg-app-purple-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-app-purple-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Synthesizing...' : isTranscribing ? 'Decoding...' : 'Initialize'}
                {!loading && !isTranscribing && <IconSparkles className="w-3.5 h-3.5" />}
              </button>
            </div>
          </form>
          <div className="mt-8 pt-6 border-t border-app-border flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-app-purple-400 animate-pulse"></div>
            <p className="text-[10px] text-app-muted font-black uppercase tracking-widest">
              Gemini Protocol v1.4 Active
            </p>
          </div>
       </div>
    </div>
  );
};

export default SmartTaskInput;