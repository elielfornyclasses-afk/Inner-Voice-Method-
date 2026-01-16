
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decodeAudioData, decodeBase64, createPcmBlob } from '../services/gemini';
import { DayOfWeek, TranscriptionItem } from '../types';
import { METHODOLOGY } from '../constants';

type SessionMode = 'practice' | 'chat';

interface LiveVoiceSessionProps {
  day: DayOfWeek;
  lessonContent: string;
  mode: SessionMode;
  onStatusChange: (status: 'idle' | 'connecting' | 'active' | 'error') => void;
  onClose: () => void;
}

const LiveVoiceSession: React.FC<LiveVoiceSessionProps> = ({ day, lessonContent, mode, onStatusChange, onClose }) => {
  const [localStatus, setLocalStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [history, setHistory] = useState<TranscriptionItem[]>([]);
  
  const currentInputTextRef = useRef('');
  const currentOutputTextRef = useRef('');
  const [displayInputText, setDisplayInputText] = useState('');
  const [displayOutputText, setDisplayOutputText] = useState('');
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentMethod = METHODOLOGY.find(m => m.day === day)!;

  // Scroll mais agressivo para acompanhar o streaming de texto
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, displayInputText, displayOutputText]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close?.(); } catch (e) {}
      sessionRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close().catch(() => {});
      outputAudioContextRef.current = null;
    }
    
    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    sourcesRef.current.clear();
    
    onStatusChange('idle');
    onClose();
  }, [onStatusChange, onClose]);

  const startSession = async () => {
    try {
      setLocalStatus('connecting');
      onStatusChange('connecting');

      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        alert("Chave API ausente.");
        await (window as any).aistudio.openSelectKey();
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await audioCtx.resume();
      await outputAudioCtx.resume();
      
      audioContextRef.current = audioCtx;
      outputAudioContextRef.current = outputAudioCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const isPractice = mode === 'practice';
      
      const systemInstruction = `
        VOCÊ É UM MENTOR DO INNER VOICE METHOD. 
        TEXTO BASE: "${lessonContent}"
        
        DIRETRIZ CRÍTICA: Seja EXTREMAMENTE DIRETO, OBJETIVO e CONCISO. Evite frases de preenchimento.
        Vá direto ao ponto. Respostas curtas.

        MODO: ${isPractice ? 'TREINAMENTO TÉCNICO' : 'CONVERSAÇÃO NATURAL'}

        DIRETRIZES:
        ${isPractice 
          ? `PRÁTICA TÉCNICA (${currentMethod.day}: ${currentMethod.title}).
             INSTRUÇÃO: ${currentMethod.instruction}.
             COMPORTAMENTO: Corrija apenas o som/ritmo. Seja breve.`
          : `DIÁLOGO NATURAL. 
             COMPORTAMENTO: NÃO peça repetições. Aja como um parceiro de conversa real. 
             Fale sobre o tema do texto. Use vocabulário do texto naturalmente.
             Respostas rápidas e fluidas.`
        }

        LÍNGUA:
        - 95% Inglês.
        - Português apenas se estritamente necessário para clareza do método.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: isPractice ? 'Kore' : 'Zephyr' } },
          },
          systemInstruction: systemInstruction,
        },
        callbacks: {
          onopen: () => {
            setLocalStatus('active');
            onStatusChange('active');
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => { session.sendRealtimeInput({ media: pcmBlob }); });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message) => {
            // Streaming de transcrição de entrada (aluno)
            if (message.serverContent?.inputTranscription) {
              currentInputTextRef.current += message.serverContent.inputTranscription.text;
              setDisplayInputText(currentInputTextRef.current);
            }
            // Streaming de transcrição de saída (IA/Mentor) - Aparece ENQUANTO fala
            if (message.serverContent?.outputTranscription) {
              currentOutputTextRef.current += message.serverContent.outputTranscription.text;
              setDisplayOutputText(currentOutputTextRef.current);
            }

            if (message.serverContent?.turnComplete) {
              const userT = currentInputTextRef.current;
              const aiT = currentOutputTextRef.current;
              
              if (userT.trim() || aiT.trim()) {
                setHistory(prev => [
                  ...prev,
                  { speaker: 'user' as const, text: userT, timestamp: Date.now() },
                  { speaker: 'ai' as const, text: aiT, timestamp: Date.now() }
                ].filter(i => i.text.trim() !== ''));
              }

              currentInputTextRef.current = '';
              currentOutputTextRef.current = '';
              setDisplayInputText('');
              setDisplayOutputText('');
            }

            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data && outputAudioContextRef.current) {
                  const ctx = outputAudioContextRef.current;
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                  const buffer = await decodeAudioData(decodeBase64(part.inlineData.data), ctx, 24000, 1);
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(ctx.destination);
                  source.onended = () => sourcesRef.current.delete(source);
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: any) => {
            setLocalStatus('error');
            onStatusChange('error');
            stopSession();
          },
          onclose: () => onStatusChange('idle')
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (error) {
      setLocalStatus('error');
      onStatusChange('error');
    }
  };

  useEffect(() => {
    startSession();
    return () => { stopSession(); };
  }, []);

  if (localStatus === 'connecting') {
    return (
      <div className="flex flex-col items-center gap-8 py-14">
        <div className="w-20 h-20 border-[6px] border-slate-900 border-t-indigo-500 rounded-full animate-spin shadow-2xl"></div>
        <p className="text-slate-600 font-black text-[11px] uppercase tracking-[0.5em] animate-pulse italic">Iniciando Mentor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full animate-in fade-in duration-700">
      <div className="relative">
        <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-2 transition-all duration-700 ${mode === 'practice' ? 'border-indigo-500 bg-slate-950' : 'border-emerald-500 bg-slate-950'}`}>
           {mode === 'practice' ? (
             <svg className="w-14 h-14 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
           ) : (
             <svg className="w-14 h-14 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
           )}
           <div className="absolute -top-1 -right-1">
              <span className={`flex w-4 h-4 rounded-full ${mode === 'practice' ? 'bg-indigo-500' : 'bg-emerald-500'} animate-ping opacity-75`}></span>
           </div>
        </div>
      </div>

      <div className="text-center">
        <p className={`font-black text-[10px] uppercase tracking-[0.4em] mb-2 italic ${mode === 'practice' ? 'text-indigo-400' : 'text-emerald-400'}`}>
          {mode === 'practice' ? 'Calibração em Curso' : 'Diálogo Aberto'}
        </p>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{currentMethod.title}</p>
      </div>

      <div className="w-full max-w-2xl bg-slate-950/50 rounded-[3.5rem] overflow-hidden shadow-2xl h-[450px] flex flex-col border border-slate-800">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 scroll-smooth">
          {history.map((item, idx) => (
            <div key={idx} className={`flex flex-col ${item.speaker === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-3`}>
              <span className={`text-[8px] font-black uppercase tracking-[0.3em] mb-2 ${item.speaker === 'user' ? 'text-indigo-500' : 'text-slate-600'}`}>
                {item.speaker === 'user' ? 'User' : 'Mentor'}
              </span>
              <div className={`max-w-[85%] px-6 py-4 rounded-[1.8rem] text-[15px] leading-relaxed font-medium shadow-2xl border ${
                item.speaker === 'user' 
                  ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                  : 'bg-slate-900 text-slate-300 border-slate-800 rounded-tl-none'
              }`}>
                {item.text}
              </div>
            </div>
          ))}
          
          {/* Transcrição em tempo real do Aluno */}
          {displayInputText && (
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black uppercase text-indigo-800 mb-2 italic tracking-widest">Listening...</span>
              <div className="max-w-[85%] px-6 py-4 bg-slate-900/50 text-indigo-400/80 rounded-[1.8rem] rounded-tr-none text-[15px] italic border border-indigo-950 shadow-inner">
                {displayInputText}
              </div>
            </div>
          )}

          {/* Transcrição em tempo real do Mentor (Enquanto fala) */}
          {displayOutputText && (
            <div className="flex flex-col items-start">
              <span className="text-[8px] font-black uppercase text-emerald-800 mb-2 italic tracking-widest">Speaking...</span>
              <div className="max-w-[85%] px-6 py-4 bg-slate-900/40 text-slate-300 rounded-[1.8rem] rounded-tl-none text-[15px] border border-slate-800 shadow-xl">
                {displayOutputText}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={stopSession}
        className="group flex items-center gap-4 px-12 py-5 bg-slate-950 text-slate-400 border border-slate-800 rounded-full font-black hover:text-red-400 hover:border-red-900/50 transition-all shadow-2xl text-[10px] uppercase tracking-[0.3em] active:scale-95"
      >
        <span className="w-2 h-2 bg-red-600 rounded-full group-hover:animate-ping"></span>
        Finalizar Sessão
      </button>
    </div>
  );
};

export default LiveVoiceSession;
