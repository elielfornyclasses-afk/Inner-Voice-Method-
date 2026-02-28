import React, { useState, useEffect } from 'react';
import { SignIn, SignUp, UserButton, useUser, useAuth } from '@clerk/clerk-react';
import { DayOfWeek } from './types';
import { METHODOLOGY, DEFAULT_LESSON_CONTENT, PEDAGOGICAL_PRINCIPLES } from './constants';
import DaySelector from './components/DaySelector';
import LiveVoiceSession from './components/LiveVoiceSession';

const App: React.FC = () => {
  const { isSignedIn, isLoaded } = useUser();
  const { signOut } = useAuth();
  
  const [currentDay, setCurrentDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [sessionMode, setSessionMode] = useState<'practice' | 'chat' | null>(null);
  const [lessonText, setLessonText] = useState<string>(DEFAULT_LESSON_CONTENT);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempText, setTempText] = useState<string>('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState<'signin' | 'signup' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('inner_voice_lesson_text');
    if (saved) setLessonText(saved);
  }, []);

  const handleSaveText = () => {
    setLessonText(tempText);
    localStorage.setItem('inner_voice_lesson_text', tempText);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setTempText(lessonText);
    setIsEditing(true);
  };

  const currentMethod = METHODOLOGY.find((m) => m.day === currentDay)!;

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-lg">
              V
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Inner Voice Method</h1>
            <p className="text-slate-600">Entre para continuar praticando</p>
          </div>
          
          {showAuthModal === 'signin' && (
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <SignIn 
                routing="hash"
                afterSignInUrl="/"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none"
                  }
                }}
              />
              <button 
                onClick={() => setShowAuthModal('signup')}
                className="w-full mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Não tem conta? Criar conta
              </button>
            </div>
          )}
          
          {showAuthModal === 'signup' && (
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <SignUp 
                routing="hash"
                afterSignUpUrl="/"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none"
                  }
                }}
              />
              <button 
                onClick={() => setShowAuthModal('signin')}
                className="w-full mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Já tem conta? Entrar
              </button>
            </div>
          )}
          
          {!showAuthModal && (
            <div className="space-y-4">
              <button
                onClick={() => setShowAuthModal('signin')}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Entrar
              </button>
              <button
                onClick={() => setShowAuthModal('signup')}
                className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all border-2 border-indigo-600"
              >
                Criar Conta
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200">V</div>
            <h1 className="text-lg font-black tracking-tight text-slate-800 uppercase">Inner Voice <span className="text-indigo-600">Method</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowCheckIn(true)}
              className="text-[10px] font-bold bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors uppercase tracking-widest"
            >
              Check-in Semanal
            </button>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10"
                }
              }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        {/* Intro Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-[0.3em] flex items-center gap-2">
                <span className="w-6 h-[2px] bg-indigo-600 rounded-full"></span>
                Direção Perceptiva
              </h2>
              <h3 className="text-3xl font-black text-slate-900 leading-tight">Sua voz interna organiza sua fala.</h3>
              <p className="text-slate-500 mt-2 font-medium max-w-lg">Pratique com leveza e constância. O objetivo não é acertar, é alinhar sua escuta com a produção oral.</p>
            </div>
            <DaySelector currentDay={currentDay} onSelect={setCurrentDay} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            {/* Principles Card */}
            <div className="bg-indigo-900 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
               <h4 className="font-black text-[10px] uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 Princípios do Método
               </h4>
               <div className="space-y-6">
                 {PEDAGOGICAL_PRINCIPLES.map((p, idx) => (
                   <div key={idx} className="group">
                     <p className="text-xs font-black uppercase tracking-wider text-indigo-100 mb-1">{p.title}</p>
                     <p className="text-slate-400 text-xs font-medium leading-relaxed">{p.description}</p>
                   </div>
                 ))}
               </div>
            </div>

            {/* Daily Routine Card */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-indigo-100">
                    {currentDay === DayOfWeek.MONDAY && "🎧"}
                    {currentDay === DayOfWeek.TUESDAY && "🥁"}
                    {currentDay === DayOfWeek.WEDNESDAY && "🗣️"}
                    {currentDay === DayOfWeek.THURSDAY && "🚀"}
                    {currentDay === DayOfWeek.FRIDAY && "🌟"}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{currentDay}</h3>
                    <p className="text-indigo-600 font-black text-[10px] uppercase tracking-wider">{currentMethod.title}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {currentMethod.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="mt-1 w-5 h-5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">
                        {idx + 1}
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed font-semibold">{step}</p>
                    </div>
                  ))}
                </div>
            </div>
          </div>

          {/* Main Area */}
          <div className="lg:col-span-8 space-y-8">
            {/* Text Editor */}
            <div className={`bg-white rounded-[2.5rem] border-2 shadow-sm transition-all duration-500 overflow-hidden ${isEditing ? 'border-indigo-500 ring-[12px] ring-indigo-50 shadow-2xl' : 'border-slate-100'}`}>
              <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-black text-slate-800 text-[10px] tracking-widest uppercase flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
                  Material de Sustentação
                </h3>
                {!isEditing ? (
                  <button onClick={handleStartEdit} className="text-[10px] font-black text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    {lessonText ? 'EDITAR TEXTO' : 'COLE SEU TEXTO'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="text-[10px] font-black text-slate-400 px-4 py-2">CANCELAR</button>
                    <button onClick={handleSaveText} className="text-[10px] font-black text-white bg-indigo-600 px-5 py-2 rounded-lg shadow-lg shadow-indigo-100">SALVAR</button>
                  </div>
                )}
              </div>
              
              <div className="p-10 min-h-[400px]">
                {isEditing ? (
                  <textarea
                    value={tempText}
                    onChange={(e) => setTempText(e.target.value)}
                    className="w-full h-[400px] p-0 bg-transparent outline-none text-slate-800 text-xl font-medium leading-relaxed resize-none transition-all placeholder:text-slate-300"
                    placeholder="Cole aqui o texto da semana (baseado em sua vida real)..."
                    autoFocus
                  />
                ) : (
                  <div className="prose prose-slate max-w-none">
                    {lessonText ? (
                      lessonText.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="text-slate-700 text-xl leading-relaxed mb-6 font-medium tracking-tight last:mb-0">
                          {paragraph}
                        </p>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 mb-6">
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">Inicie seu ciclo semanal</p>
                        <button onClick={handleStartEdit} className="text-indigo-600 font-black text-lg hover:underline underline-offset-4">Clique para colar seu texto de estudo</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Interaction Center */}
            <div className={`bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl relative overflow-hidden transition-opacity ${isEditing ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
               {sessionMode ? (
                 <LiveVoiceSession 
                    day={currentDay}
                    lessonContent={lessonText}
                    mode={sessionMode}
                    onStatusChange={setSessionStatus}
                    onClose={() => {
                      setSessionMode(null);
                      setSessionStatus('idle');
                    }}
                 />
               ) : (
                 <div className="flex flex-col items-center">
                    <div className="mb-10 text-center">
                       <h3 className="text-2xl font-black text-slate-800 mb-1">Sessão Autônoma Guiada</h3>
                       <p className="text-slate-500 font-medium text-sm">Use 10 a 20 minutos por dia para alinhar sua voz.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                       <button
                         disabled={!lessonText}
                         onClick={() => setSessionMode('practice')}
                         className="group p-8 bg-indigo-600 rounded-[2rem] text-white flex flex-col items-center gap-4 transition-all hover:scale-105 hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:grayscale"
                       >
                         <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                           <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                         </div>
                         <div className="text-center">
                            <span className="block font-black text-base">Modo Prática</span>
                            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">IA Leitora de Padrões</span>
                         </div>
                       </button>

                       <button
                         disabled={!lessonText}
                         onClick={() => setSessionMode('chat')}
                         className="group p-8 bg-emerald-600 rounded-[2rem] text-white flex flex-col items-center gap-4 transition-all hover:scale-105 hover:bg-emerald-700 shadow-xl shadow-emerald-100 disabled:opacity-50 disabled:grayscale"
                       >
                         <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                           <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                         </div>
                         <div className="text-center">
                            <span className="block font-black text-base">Fala Livre</span>
                            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest">Integração Sem Filtros</span>
                         </div>
                       </button>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>

      {/* Check-in Modal */}
      {showCheckIn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/60 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
             <button onClick={() => setShowCheckIn(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
             <h3 className="text-2xl font-black text-slate-800 mb-2">Check-in Perceptivo</h3>
             <p className="text-slate-500 text-sm mb-8">Reflexão semanal conforme seção 15 do guia.</p>
             <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 italic">"O que você percebeu no som esta semana?"</label>
                  <textarea className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:border-indigo-300 outline-none resize-none" placeholder="Ex: Percebi que as vogais finais estão mais relaxadas..."></textarea>
                </div>
                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 italic">"Onde sentiu mais fluidez?"</label>
                  <textarea className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:border-indigo-300 outline-none resize-none" placeholder="Ex: Senti mais facilidade nas pausas rítmicas..."></textarea>
                </div>
                <button 
                  onClick={() => { alert("Reflexão salva no seu progresso interno."); setShowCheckIn(false); }}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-black transition-all uppercase tracking-widest text-[10px]"
                >
                  Finalizar Ciclo Semanal
                </button>
             </div>
          </div>
        </div>
      )}

      <footer className="py-12 bg-white border-t border-slate-100 mt-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">© Inner Voice Method • Alinhamento Linguístico</div>
          <div className="flex gap-8">
            <button onClick={() => { if(confirm("Limpar dados?")) { setLessonText(""); localStorage.removeItem('inner_voice_lesson_text'); } }} className="text-slate-400 hover:text-red-500 font-black text-[10px] uppercase tracking-widest transition-colors">Reset System</button>
            <div className="text-slate-300 font-black text-[10px] uppercase tracking-widest underline decoration-indigo-100 italic">Clareza precede prática</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
