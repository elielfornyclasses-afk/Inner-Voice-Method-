import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decodeAudioData, decodeBase64, createPcmBlob } from '../services/gemini';
import { DayOfWeek, TranscriptionItem } from '../types';
import { METHODOLOGY } from '../constants';

interface LiveVoiceSessionProps {
  day: DayOfWeek;
  lessonContent: string;
  lessonLanguage: 'english' | 'french';
  mode: 'practice' | 'free';
  onStatusChange: (status: 'idle' | 'connecting' | 'active' | 'error') => void;
  onClose: () => void;
  onPracticeComplete?: () => void;
}

const LiveVoiceSession: React.FC<LiveVoiceSessionProps> = ({ day, lessonContent, lessonLanguage, mode, onStatusChange, onClose, onPracticeComplete }) => {
  const [localStatus, setLocalStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [history, setHistory] = useState<TranscriptionItem[]>([]);

  const currentOutputTextRef = useRef('');
  const [displayOutputText, setDisplayOutputText] = useState('');

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentMethod = METHODOLOGY.find(m => m.day === day)!;
  const targetLanguage = lessonLanguage === 'french' ? 'French' : 'English';
  const targetLanguagePT = lessonLanguage === 'french' ? 'francês' : 'inglês';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, displayOutputText]);

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

    if (mode === 'practice') {
      onPracticeComplete?.();
    }

    onStatusChange('idle');
    onClose();
  }, [onStatusChange, onClose, mode, onPracticeComplete]);

  const startSession = async () => {
    try {
      setLocalStatus('connecting');
      onStatusChange('connecting');

      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        setLocalStatus('error');
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      if (audioCtx.state === 'suspended') await audioCtx.resume();
      if (outputAudioCtx.state === 'suspended') await outputAudioCtx.resume();

      audioContextRef.current = audioCtx;
      outputAudioContextRef.current = outputAudioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const practiceInstruction = `
VOCÊ É UM MENTOR DO INNER VOICE METHOD.

⚠️ REGRA CRÍTICA DE PACIÊNCIA (OBRIGATÓRIA):
Após ler uma frase ou pedir uma repetição, você DEVE AGUARDAR em silêncio até o aluno terminar de responder.
NUNCA continue para a próxima instrução antes de ouvir a resposta do aluno.
NUNCA diga "Now the whole sentence" antes de o aluno ter tentado repetir a parte isolada.
A sequência OBRIGATÓRIA é: você fala → aluno responde → você dá feedback → próximo passo.

⚠️ REGRA DE RITMO: TRABALHE APENAS UMA FRASE POR VEZ (máximo 10-15 palavras).
Leia UMA frase, aguarde o aluno repetir, dê feedback, e só então vá para a próxima frase.
NUNCA leia o texto completo ou múltiplas frases de uma vez.

TEXTO DA LIÇÃO: "${lessonContent}"

DIRETRIZ MESTRA: "OUÇA E REPITA"
- NUNCA peça ao aluno para ler sem você ler antes.
- SEMPRE forneça o modelo de som antes de esperar a produção do aluno.

PROTOCOLO DE CORREÇÃO (OBRIGATÓRIO):
Sempre que o aluno cometer um erro de pronúncia ou ritmo:
1. Identifique e diga as PALAVRAS EXATAS que foram erradas.
2. Peça a repetição APENAS dessas palavras: "Repeat just this part: [Palavra]".
3. AGUARDE o aluno repetir a palavra isolada.
4. Somente após a resposta do aluno, leia a FRASE INTEIRA corretamente.
5. Peça a repetição da FRASE INTEIRA: "Now, the whole sentence: [Frase]".
6. AGUARDE o aluno repetir a frase inteira antes de continuar.

PRÁTICA DE HOJE — ${currentMethod.day}: ${currentMethod.title}
INSTRUÇÃO TÉCNICA: ${currentMethod.instruction}

INÍCIO: Saude o aluno brevemente, anuncie a prática de ${currentMethod.day} (${currentMethod.title}) e inicie a leitura da primeira frase do texto para que ele repita.
`;

      const freeInstruction = `
VOCÊ É UM MENTOR DO INNER VOICE METHOD.

O aluno já completou a prática estruturada de hoje. Este é um momento de CONVERSAÇÃO LIVRE baseada na lição.

⚠️ REGRA DE IDIOMA (ABSOLUTA E INVIOLÁVEL):
O idioma desta lição é ${targetLanguage.toUpperCase()}.
Você DEVE conduzir TODA a conversa em ${targetLanguage} — sem exceção.
Se o aluno falar em português ou qualquer outro idioma, responda SEMPRE em ${targetLanguage}.
NUNCA mude para o português, mesmo que o aluno insista ou faça perguntas em português.
Se o aluno perguntar algo em português, responda a pergunta em ${targetLanguage}.
Seu papel é manter o aluno imerso no ${targetLanguagePT}.

TEXTO DA LIÇÃO (referência): "${lessonContent}"

DIRETRIZES:
- Converse naturalmente sobre os temas e vocabulário da lição.
- Expanda as ideias do texto com perguntas abertas e comentários.
- Corrija erros de pronúncia e gramática de forma leve e natural — sem interromper o fluxo da conversa.
- Encoraje o aluno a falar livremente, sem roteiro.
- O objetivo é fluência espontânea, não repetição.
- AGUARDE sempre a resposta do aluno antes de continuar.

INÍCIO: Cumprimente o aluno em ${targetLanguage}, parabenize-o pela prática de hoje e faça uma pergunta aberta sobre o tema da lição para iniciar a conversa.
`;

      const systemInstruction = mode === 'free' ? freeInstruction : practiceInstruction;

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
              sessionPromise.then((session) => {
                if (session) session.sendRealtimeInput({ media: pcmBlob });
              }).catch(() => {});
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputTextRef.current += message.serverContent.outputTranscription.text;
              setDisplayOutputText(currentOutputTextRef.current);
            }

            if (message.serverContent?.turnComplete) {
              const aiT = currentOutputTextRef.current;
              if (aiT.trim()) {
                setHistory(prev => [
                  ...prev,
                  { speaker: 'ai' as const, text: aiT, timestamp: Date.now() }
                ]);
              }
              currentOutputTextRef.current = '';
              setDisplayOutputText('');
            }

            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data && outputAudioContextRef.current) {
                  const ctx = outputAudioContextRef.current;
                  const decodedBytes = decodeBase64(part.inlineData.data);
                  const buffer = await decodeAudioData(decodedBytes, ctx, 24000, 1);

                  const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(ctx.destination);

                  source.onended = () => {
                    sourcesRef.current.delete(source);
                  };

                  source.start(startTime);
                  nextStartTimeRef.current = startTime + buffer.duration;
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
          onclose: () => {
            onStatusChange('idle');
          }
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
        <div className="w-16 h-16 sm:w-20 sm:h-20 border-[6px] border-slate-900 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-600 font-black text-[11px] uppercase tracking-[0.5em] animate-pulse italic">Iniciando Mentor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 w-full animate-in fade-in duration-700">
      <div className="relative">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center shadow-2xl border-2 border-indigo-500 bg-slate-950 transition-all duration-700">
          <svg className="w-12 h-12 sm:w-14 sm:h-14 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
          <div className="absolute -top-1 -right-1">
            <span className="flex w-4 h-4 rounded-full bg-indigo-500 animate-ping opacity-75"></span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="font-black text-[10px] uppercase tracking-[0.4em] mb-1 sm:mb-2 italic text-indigo-400">
          {mode === 'free' ? 'Fala Livre' : 'Mentor Liderando'}
        </p>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{currentMethod.title}</p>
      </div>

      <div className="w-full max-w-2xl bg-slate-950/50 rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl h-[400px] sm:h-[450px] flex flex-col border border-slate-800">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-10 space-y-4 sm:space-y-8 scroll-smooth">

          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-4 py-1.5 border border-slate-800 rounded-full">
              ● {mode === 'free' ? 'Fala livre iniciada' : 'Chat iniciado'}
            </span>
          </div>

          {history.map((item, idx) => (
            <div key={idx} className="flex flex-col items-start">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] mb-1.5 text-slate-600">
                Mentor
              </span>
              <div className="max-w-[92%] sm:max-w-[85%] px-4 py-3 sm:px-6 sm:py-4 rounded-[1.2rem] sm:rounded-[1.8rem] text-[14px] sm:text-[15px] leading-relaxed font-medium shadow-2xl border bg-slate-900 text-slate-300 border-slate-800 rounded-tl-none">
                {item.text}
              </div>
            </div>
          ))}

          {displayOutputText && (
            <div className="flex flex-col items-start">
              <span className="text-[8px] font-black uppercase text-emerald-800 mb-1.5 italic tracking-widest">Mentor instruindo...</span>
              <div className="max-w-[92%] sm:max-w-[85%] px-4 py-3 sm:px-6 sm:py-4 bg-slate-900/40 text-slate-300 rounded-[1.2rem] sm:rounded-[1.8rem] rounded-tl-none text-[14px] sm:text-[15px] border border-slate-800">
                {displayOutputText}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={stopSession}
        className="group flex items-center gap-4 px-8 sm:px-12 py-4 sm:py-5 bg-slate-950 text-slate-400 border border-slate-800 rounded-full font-black hover:text-red-400 transition-all text-[10px] uppercase tracking-[0.3em]"
      >
        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
        Finalizar Sessão
      </button>
    </div>
  );
};

export default LiveVoiceSession;
