import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, Blob } from '@google/genai';
import { Task, Status, Priority, Frequency, FitnessCategory } from '../types';
import { IconMic, IconSparkles } from './Icons';

interface ZoraAssistantProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'streak' | 'lastCompleted'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

const IconRadio = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="2"/><path d="M12 19v-4"/><path d="M15.3 9a5 5 0 0 1 0 6"/><path d="M17.7 7a9 9 0 0 1 0 10"/><path d="M6.3 15a5 5 0 0 1 0-6"/><path d="M3.3 17a9 9 0 0 1 0-10"/></svg>
);

const ZoraAssistant: React.FC<ZoraAssistantProps> = ({ tasks, onAddTask, onUpdateTask, onDeleteTask }) => {
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWakeWordMode, setIsWakeWordMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const tasksRef = useRef(tasks);

  // Wake word recognition state
  const recognitionRef = useRef<any>(null);

  // Keep ref in sync so tools access latest state
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Audio Playback
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Clean up function to stop all audio processing
  const cleanupAudio = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  // Background Wake-Word Listener Logic
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    if (isWakeWordMode && !connected) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('')
          .toLowerCase();

        if (transcript.includes('zora') || transcript.includes('hey zora')) {
          console.log("Wake word detected!");
          connectToZora();
          recognitionRef.current.stop();
        }
      };

      recognitionRef.current.onend = () => {
        if (isWakeWordMode && !connected) {
          try { recognitionRef.current.start(); } catch (e) {}
        }
      };

      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech recognition start error:", e);
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isWakeWordMode, connected]);

  // Initialization for Live API
  const connectToZora = async () => {
    if (connected) return;
    setErrorMsg(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Use default hardware rate to avoid NotSupportedError
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      await inputCtx.resume();
      audioContextRef.current = inputCtx;

      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await outputCtx.resume();
      outputAudioContextRef.current = outputCtx;
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      outputNodeRef.current = outputNode;

      // Define Tools
      const tools: FunctionDeclaration[] = [
        {
          name: 'getTasks',
          description: 'Get the current list of tasks to see what is on the schedule.',
          parameters: {
             type: Type.OBJECT,
             properties: {
                listName: { type: Type.STRING, description: "Optional filter for the list" }
             }
          }
        },
        {
          name: 'addTask',
          description: 'Add a new task to the list.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              status: { type: Type.STRING, enum: Object.values(Status) },
              priority: { type: Type.STRING, enum: Object.values(Priority) },
              frequency: { type: Type.STRING, enum: Object.values(Frequency) },
              nextDue: { type: Type.STRING, description: "YYYY-MM-DD" },
              category: { type: Type.STRING, enum: Object.values(FitnessCategory), description: "Optional category" },
              reps: { type: Type.STRING, description: "Workout duration or reps/sets" }
            },
            required: ['title', 'status', 'frequency', 'priority', 'nextDue']
          }
        },
        {
          name: 'updateTaskStatus',
          description: 'Update the status of a task.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              status: { type: Type.STRING, enum: Object.values(Status) }
            },
            required: ['id', 'status']
          }
        }
      ];

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          systemInstruction: "You are Zora, a helpful and efficient personal task manager assistant. You have full access to the user's task app. Always be concise. Confirm actions verbally.",
          tools: [{ functionDeclarations: tools }],
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          }
        },
        callbacks: {
          onopen: () => {
            setConnected(true);
            const source = inputCtx.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (!audioContextRef.current || audioContextRef.current.state !== 'running') return;
              const inputData = e.inputBuffer.getChannelData(0);
              const resampledData = resample(inputData, inputCtx.sampleRate, 16000);
              const pcmBlob = createBlob(resampledData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob })).catch(() => {});
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
               const functionResponses = [];
               for (const fc of msg.toolCall.functionCalls) {
                let result: any = { result: "ok" };
                try {
                    if (fc.name === 'getTasks') {
                        result = tasksRef.current.map(t => ({ id: t.id, title: t.title, status: t.status }));
                    } else if (fc.name === 'addTask') {
                        onAddTask({
                            title: fc.args.title as string,
                            status: fc.args.status as Status,
                            priority: fc.args.priority as Priority,
                            frequency: fc.args.frequency as Frequency,
                            nextDue: fc.args.nextDue as string,
                            category: fc.args.category as string,
                            reps: fc.args.reps as string
                        });
                        result = { result: "Task added" };
                    } else if (fc.name === 'updateTaskStatus') {
                        const task = tasksRef.current.find(t => t.id === fc.args.id);
                        if (task) {
                            onUpdateTask({ ...task, status: fc.args.status as Status });
                            result = { result: "Status updated" };
                        } else result = { error: "Task not found" };
                    }
                } catch (e) { result = { error: "Execution error" }; }
                functionResponses.push({ id: fc.id, name: fc.name, response: result });
              }
              if (functionResponses.length > 0) {
                  sessionPromise.then(session => session.sendToolResponse({ functionResponses }));
              }
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
               setIsSpeaking(true);
               const ctx = outputAudioContextRef.current!;
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNodeRef.current!);
               source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) setIsSpeaking(false);
               });
               source.start(nextStartTimeRef.current);
               sourcesRef.current.add(source);
               nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onclose: () => {
             setConnected(false);
             setIsSpeaking(false);
             cleanupAudio();
          },
          onerror: (err) => {
             console.error("Zora Error:", err);
             setErrorMsg("Service unavailable. Try again in a moment.");
             setConnected(false);
             setIsSpeaking(false);
             cleanupAudio();
          }
        }
      });
    } catch (e) {
      setErrorMsg("Failed to connect to assistant.");
      setConnected(false);
      cleanupAudio();
    }
  };

  const disconnect = () => {
    setConnected(false);
    setIsSpeaking(false);
    cleanupAudio();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {errorMsg && (
          <div className="bg-red-500 text-white text-[10px] px-3 py-1 rounded-full animate-bounce shadow-lg">
              {errorMsg}
          </div>
      )}
      <div className="flex items-center gap-3">
          <button
            onClick={() => setIsWakeWordMode(!isWakeWordMode)}
            title={isWakeWordMode ? "Listening for 'Zora'" : "Enable Wake word"}
            className={`p-3 rounded-full shadow-lg transition-all border ${
                isWakeWordMode 
                ? 'bg-purple-600/20 border-purple-500 text-purple-400' 
                : 'bg-[#202020] border-[#373737] text-gray-500 hover:text-white'
            }`}
          >
            <div className={isWakeWordMode && !connected ? 'animate-pulse' : ''}>
                <IconRadio className="w-6 h-6" />
            </div>
          </button>

          <button
            onClick={connected ? disconnect : connectToZora}
            className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 ${
              connected 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white' 
                : isWakeWordMode && !connected
                    ? 'bg-[#2a2a2a] border border-purple-500/50 text-gray-300 hover:bg-[#333]'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <div className="relative">
                 <IconMic className="w-6 h-6" />
                 {connected && isSpeaking && (
                     <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-[#191919]"></span>
                 )}
            </div>
            <span className="font-semibold">
                {connected 
                    ? (isSpeaking ? 'Zora Speaking...' : 'Listening...') 
                    : isWakeWordMode 
                        ? 'Say "Zora"' 
                        : 'Call Zora'}
            </span>
          </button>
      </div>
    </div>
  );
};

// --- Audio Helpers ---
function resample(data: Float32Array, oldSampleRate: number, newSampleRate: number): Float32Array {
    const ratio = oldSampleRate / newSampleRate;
    const newLength = Math.round(data.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        result[i] = data[Math.round(i * ratio)];
    }
    return result;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export default ZoraAssistant;