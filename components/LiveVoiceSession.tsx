
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decodeAudioData, decodeBase64, createPcmBlob } from '../services/gemini';
import { DayOfWeek, TranscriptionItem } from '../types';
import { METHODOLOGY } from '../constants';

interface LiveVoiceSessionProps {
  day: DayOfWeek;
  lessonContent: string;
  onStatusChange: (status: 'idle' | 'connecting' | 'active' | 'error') => void;
  onClose: () => void;
}

const LiveVoiceSession: React.FC<LiveVoiceSessionProps> = ({ day, lessonContent, onStatusChange, onClose }) => {
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

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.error("VITE_GEMINI_API_KEY não configurada nas variáveis de ambiente.");
        setLocalStatus('error');
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await audioCtx.resume();
      await outputAudioCtx.resume();
      
      audioContextRef.current = audioCtx;
      outputAudioContextRef.current = outputAudioCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const systemInstruction = `
        VOCÊ É UM MENTOR DO INNER VOICE METHOD. 
        TEXTO DA LIÇÃO ATUAL: "${lessonContent}"
        
        PERSONALIDADE E DIRETRIZES GERAIS:
        - Seja um LÍDER e GUIA proativo. Você dita o ritmo da sessão.
        - Seja DIRETO, CONCISO e extremamente encorajador.
        - IDIOMA: Use INGLÊS (95% do tempo). Use PORTUGUÊS apenas para traduções rápidas ou explicações técnicas breves.
        - INÍCIO: Comece a falar imediatamente saudando o aluno e introduzindo a atividade do dia.

        MODO PRÁTICA INTEGRADO (${currentMethod.day}: ${currentMethod.title}):
        - OBJETIVO TÉCNICO: ${currentMethod.instruction}.
        - CONDUÇÃO ATIVA: Guie o aluno na técnica do dia. Use comandos como "Listen to this part...", "Try to produce this specific sound...".
        - ATENÇÃO À REPETIÇÃO: Quando o exercício envolver repetição técnica, monitore omissões ou erros de ritmo/pronúncia e corrija na hora com precisão e gentileza.

        CONVERSAÇÃO E ESTÍMULO (INTEGRADO):
        - FLUIDEZ: Não se limite apenas à repetição técnica. Estimule uma conversa natural e espontânea baseada no texto.
        - CURIOSIDADE: Faça perguntas abertas sobre o conteúdo. Peça opiniões do aluno. Crie cenários onde ele use o vocabulário da lição de forma criativa.
        - CORREÇÃO GRAMATICAL GENTIL: Sempre que o aluno errar a gramática durante o diálogo, corrija-o de forma suave. Use a frase: "a better way to say that is..." para introduzir a correção e continue a conversa normalmente.
        - EVITE REPETIÇÃO EXCESSIVA: No momento de conversa espontânea, não peça para o aluno repetir frases. O foco é a troca de ideias e a fluidez natural.

        ASSUMA O COMANDO AGORA.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
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
            if (message.serverContent?.inputTranscription) {
              currentInputTextRef.current += message.serverContent.inputTranscription.text;
              setDisplayInputText(currentInputTextRef.current);
            }
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
          onerror: () => {
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
        <div className="w-20 h-20 border-[6px] border-slate-900 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-600 font-black text-[11px] uppercase tracking-[0.5em] animate-pulse italic">Iniciando Mentor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full animate-in fade-in duration-700">
      <div className="relative">
        <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-2 border-indigo-500 bg-slate-950 transition-all duration-700`}>
           <svg className="w-14 h-14 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
           <div className="absolute -top-1 -right-1">
              <span className={`flex w-4 h-4 rounded-full bg-indigo-500 animate-ping opacity-75`}></span>
           </div>
        </div>
      </div>

      <div className="text-center">
        <p className={`font-black text-[10px] uppercase tracking-[0.4em] mb-2 italic text-indigo-400`}>
          Mentor Liderando
        </p>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{currentMethod.title}</p>
      </div>

      <div className="w-full max-w-2xl bg-slate-950/50 rounded-[3.5rem] overflow-hidden shadow-2xl h-[450px] flex flex-col border border-slate-800">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 scroll-smooth">
          {history.map((item, idx) => (
            <div key={idx} className={`flex flex-col ${item.speaker === 'user' ? 'items-end' : 'items-start'}`}>
              <span className={`text-[8px] font-black uppercase tracking-[0.3em] mb-2 ${item.speaker === 'user' ? 'text-indigo-500' : 'text-slate-600'}`}>
                {item.speaker === 'user' ? 'Aluno' : 'Mentor'}
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
          
          {displayInputText && (
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black uppercase text-indigo-800 mb-2 italic tracking-widest animate-pulse">Monitorando voz...</span>
              <div className="max-w-[85%] px-6 py-4 bg-slate-900/50 text-indigo-400/80 rounded-[1.8rem] rounded-tr-none text-[15px] italic border border-indigo-950">
                {displayInputText}
              </div>
            </div>
          )}

          {displayOutputText && (
            <div className="flex flex-col items-start">
              <span className="text-[8px] font-black uppercase text-emerald-800 mb-2 italic tracking-widest">Mentor instruindo...</span>
              <div className="max-w-[85%] px-6 py-4 bg-slate-900/40 text-slate-300 rounded-[1.8rem] rounded-tl-none text-[15px] border border-slate-800">
                {displayOutputText}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={stopSession}
        className="group flex items-center gap-4 px-12 py-5 bg-slate-950 text-slate-400 border border-slate-800 rounded-full font-black hover:text-red-400 transition-all text-[10px] uppercase tracking-[0.3em]"
      >
        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
        Finalizar Sessão
      </button>
    </div>
  );
};

export default LiveVoiceSession;
