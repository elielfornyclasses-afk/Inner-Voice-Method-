import React, { useState, useEffect } from 'react';
import { SignIn, SignUp, UserButton, useUser, useAuth } from '@clerk/clerk-react';
import { DayOfWeek, Subscription, InviteCode } from './types';
import { METHODOLOGY, DEFAULT_LESSON_CONTENT, PEDAGOGICAL_PRINCIPLES } from './constants';
import DaySelector from './components/DaySelector';
import LiveVoiceSession from './components/LiveVoiceSession';
import SubscriptionBadge from './components/SubscriptionBadge';
import InviteCodeInput from './components/InviteCodeInput';
import { markInviteAsUsed } from './services/invites';

const App: React.FC = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useAuth();
  
  const [currentDay, setCurrentDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [lessonText, setLessonText] = useState<string>(DEFAULT_LESSON_CONTENT);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempText, setTempText] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState<'signin' | 'signup' | 'invite' | null>(null);
  const [subscription, setSubscription] = useState<Subscription | undefined>(undefined);
  const [validatedInvite, setValidatedInvite] = useState<InviteCode | null>(null);

  useEffect(() => {
    const savedText = localStorage.getItem('inner_voice_lesson_text');
    if (savedText) setLessonText(savedText);
  }, []);

  useEffect(() => {
    if (user?.publicMetadata?.subscription) {
      setSubscription(user.publicMetadata.subscription as Subscription);
    }
  }, [user]);

  // Quando usuário criar conta com sucesso, ativa assinatura
  useEffect(() => {
    const activateSubscription = async () => {
      if (isSignedIn && user && validatedInvite && !user.publicMetadata?.subscription) {
        try {
          const now = Date.now();
          const expiresAt = now + (validatedInvite.validityDays * 24 * 60 * 60 * 1000);
          
          // Atualiza metadata do usuário no Clerk
          await user.update({
            publicMetadata: {
              subscription: {
                plan: validatedInvite.plan,
                status: 'active',
                expiresAt,
                startedAt: now
              }
            }
          });

          // Marca convite como usado
          await markInviteAsUsed(validatedInvite.code, user.emailAddresses[0]?.emailAddress || '');

          // Atualiza estado local
          setSubscription({
            plan: validatedInvite.plan,
            status: 'active',
            expiresAt,
            startedAt: now
          });

          setValidatedInvite(null);
        } catch (error) {
          console.error('Erro ao ativar assinatura:', error);
        }
      }
    };

    activateSubscription();
  }, [isSignedIn, user, validatedInvite]);

  const handleSaveText = () => {
    setLessonText(tempText);
    localStorage.setItem('inner_voice_lesson_text', tempText);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setTempText(lessonText);
    setIsEditing(true);
  };

  const handleValidCode = (invite: InviteCode) => {
    setValidatedInvite(invite);
    setShowAuthModal('signup');
  };

  const currentMethod = METHODOLOGY.find((m) => m.day === currentDay)!;

  // Configuração do Clerk (escuro)
  const clerkAppearance = {
    elements: {
      rootBox: "w-full",
      card: "shadow-none bg-transparent",
      headerTitle: "text-white font-black text-xl",
      headerSubtitle: "text-slate-400",
      formFieldInput: "bg-slate-950 border-slate-700 text-white placeholder:text-slate-600",
      formFieldLabel: "text-slate-300 font-bold text-xs uppercase tracking-wider",
      formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/30",
      socialButtonsBlockButton: "bg-slate-800 border-slate-700 text-white hover:bg-slate-700",
      socialButtonsBlockButtonText: "text-white font-semibold",
      footerActionLink: "text-indigo-400 hover:text-indigo-300 font-bold",
      dividerLine: "bg-slate-700",
      dividerText: "text-slate-500",
      formFieldInputShowPasswordButton: "text-slate-400 hover:text-white",
      identityPreviewText: "text-slate-300",
      identityPreviewEditButton: "text-indigo-400 hover:text-indigo-300",
      formResendCodeLink: "text-indigo-400 hover:text-indigo-300",
      otpCodeFieldInput: "bg-slate-950 border-slate-700 text-white"
    }
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-800 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl mx-auto mb-6 shadow-lg shadow-indigo-900/40">
              IV
            </div>
            <h1 className="text-3xl font-black text-white mb-2 italic tracking-tight">Inner Voice Method</h1>
            <p className="text-slate-500 font-medium text-sm uppercase tracking-widest">Trainer Professional</p>
          </div>
          
          {showAuthModal === 'signin' && (
            <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SignIn 
                routing="hash"
                afterSignInUrl="/"
                appearance={clerkAppearance}
              />
              <button 
                onClick={() => setShowAuthModal('invite')}
                className="w-full mt-6 text-sm text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest transition-colors"
              >
                Não tem conta? Criar conta
              </button>
            </div>
          )}
          
          {showAuthModal === 'invite' && (
            <InviteCodeInput onValidCode={handleValidCode} />
          )}
          
          {showAuthModal === 'signup' && validatedInvite && (
            <div className="space-y-4">
              <div className="bg-green-900/30 border border-green-500/30 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-green-300 font-bold text-sm">Código validado!</p>
                    <p className="text-green-400/80 text-xs mt-0.5">
                      Plano {validatedInvite.plan} • {validatedInvite.validityDays} dias
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SignUp 
                  routing="hash"
                  afterSignUpUrl="/"
                  appearance={clerkAppearance}
                />
                <button 
                  onClick={() => {
                    setShowAuthModal('signin');
                    setValidatedInvite(null);
                  }}
                  className="w-full mt-6 text-sm text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest transition-colors"
                >
                  Já tem conta? Entrar
                </button>
              </div>
            </div>
          )}
          
          {!showAuthModal && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
              <button
                onClick={() => setShowAuthModal('signin')}
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-950/40 uppercase tracking-wider"
              >
                Entrar
              </button>
              <button
                onClick={() => setShowAuthModal('invite')}
                className="w-full bg-slate-900 text-indigo-400 py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all border-2 border-slate-800 uppercase tracking-wider"
              >
                Criar Conta
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Bloqueio por assinatura expirada
  if (isSignedIn && subscription) {
    const isExpired = subscription.status === 'expired' || 
                     (subscription.expiresAt && subscription.expiresAt < Date.now());
    
    if (isExpired) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl p-10">
              <div className="w-20 h-20 bg-red-900/30 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-black text-white mb-3 italic">Assinatura Expirada</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Sua assinatura expirou em{' '}
                <span className="text-red-400 font-bold">
                  {new Date(subscription.expiresAt!).toLocaleDateString('pt-BR')}
                </span>
                . Entre em contato para renovar e continuar praticando!
              </p>
              
              <div className="space-y-3">
                <a
                  href="https://wa.me/5522999999999?text=Olá!%20Gostaria%20de%20renovar%20minha%20assinatura"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-green-500 transition-all shadow-2xl shadow-green-950/40 uppercase tracking-wider"
                >
                  💬 Falar no WhatsApp
                </a>
                
                <button
                  onClick={() => signOut()}
                  className="block w-full bg-slate-800 text-slate-400 py-3 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all uppercase tracking-wider"
                >
                  Sair
                </button>
              </div>
            </div>
            
            <p className="text-slate-600 text-xs mt-6 uppercase tracking-widest">
              Inner Voice Method • Trainer Professional
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <header className="bg-slate-950/80 border-b border-slate-900 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-900/40 text-xl">IV</div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black tracking-[0.15em] text-white uppercase italic">Inner Voice Method</h1>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">Trainer Professional</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10 rounded-xl border-2 border-slate-800"
                }
              }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <div className="mb-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="animate-in fade-in slide-in-from-left-4 duration-700">
              <h2 className="text-indigo-500 text-[10px] font-black uppercase mb-4 tracking-[0.4em] flex items-center gap-3">
                <span className="w-8 h-[2px] bg-indigo-500 rounded-full"></span>
                Direção Perceptiva
              </h2>
              <h3 className="text-4xl font-black text-white leading-tight italic tracking-tight">Sua voz interna organiza sua fala.</h3>
              <div className="mt-4 space-y-3">
                <p className="text-slate-500 font-medium">
                  Aluno: <span className="text-indigo-400 font-black">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                </p>
                <SubscriptionBadge subscription={subscription} />
              </div>
            </div>
            <DaySelector currentDay={currentDay} onSelect={setCurrentDay} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-950 p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
               <h4 className="font-black text-[10px] uppercase tracking-widest text-indigo-400 mb-8 flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 Princípios do Método
               </h4>
               <div className="space-y-8">
                 {PEDAGOGICAL_PRINCIPLES.map((p, idx) => (
                   <div key={idx} className="group">
                     <p className="text-[11px] font-black uppercase tracking-wider text-indigo-100 mb-2">{p.title}</p>
                     <p className="text-slate-500 text-xs font-medium leading-relaxed">{p.description}</p>
                   </div>
                 ))}
               </div>
            </div>

            <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-sm">
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-16 h-16 bg-slate-950 text-indigo-500 rounded-2xl flex items-center justify-center text-3xl shadow-2xl border border-slate-800">
                    {currentDay === DayOfWeek.MONDAY && "🎧"}
                    {currentDay === DayOfWeek.TUESDAY && "🥁"}
                    {currentDay === DayOfWeek.WEDNESDAY && "🗣️"}
                    {currentDay === DayOfWeek.THURSDAY && "🚀"}
                    {currentDay === DayOfWeek.FRIDAY && "🌟"}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{currentDay}</h3>
                    <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">{currentMethod.title}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {currentMethod.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-5 items-start">
                      <div className="mt-1 w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-500 shadow-inner">
                        {idx + 1}
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed font-semibold">{step}</p>
                    </div>
                  ))}
                </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className={`bg-slate-900/40 rounded-[3rem] border shadow-2xl transition-all duration-500 overflow-hidden ${isEditing ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-slate-800'}`}>
              <div className="px-10 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
                <h3 className="font-black text-slate-300 text-[10px] tracking-[0.3em] uppercase flex items-center gap-3">
                  <span className="w-2 h-4 bg-indigo-600 rounded-full"></span>
                  Material de Estudo
                </h3>
                {!isEditing ? (
                  <button onClick={handleStartEdit} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    {lessonText ? 'EDITAR' : 'COLE SEU TEXTO'}
                  </button>
                ) : (
                  <div className="flex gap-4">
                    <button onClick={() => setIsEditing(false)} className="text-[10px] font-black text-slate-500 px-4 py-2">CANCELAR</button>
                    <button onClick={handleSaveText} className="text-[10px] font-black text-white bg-indigo-600 px-6 py-2 rounded-xl shadow-lg shadow-indigo-900/20">SALVAR</button>
                  </div>
                )}
              </div>
              
              <div className="p-12 min-h-[350px]">
                {isEditing ? (
                  <textarea
                    value={tempText}
                    onChange={(e) => setTempText(e.target.value)}
                    className="w-full h-[450px] p-0 bg-transparent outline-none text-slate-300 text-xl font-medium leading-relaxed resize-none transition-all placeholder:text-slate-700"
                    placeholder="Cole aqui o texto da semana..."
                    autoFocus
                  />
                ) : (
                  <div className="prose prose-invert max-w-none">
                    {lessonText ? (
                      lessonText.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="text-slate-300 text-xl leading-relaxed mb-8 font-medium tracking-tight last:mb-0">
                          {paragraph}
                        </p>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-24 h-24 bg-slate-950 rounded-[2rem] flex items-center justify-center text-slate-800 border border-slate-800 mb-8 shadow-inner">
                           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <p className="text-slate-600 font-bold text-[11px] uppercase tracking-[0.4em] mb-2">Ciclo Semanal Vazio</p>
                        <button onClick={handleStartEdit} className="text-indigo-400 font-black text-lg hover:text-indigo-300 transition-colors italic">Clique para adicionar seu material de estudo</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`bg-slate-900/30 p-12 rounded-[4rem] border border-slate-800 shadow-2xl relative overflow-hidden transition-all ${isEditing ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}>
               {isSessionActive ? (
                 <LiveVoiceSession 
                    day={currentDay}
                    lessonContent={lessonText}
                    onStatusChange={setSessionStatus}
                    onClose={() => {
                      setIsSessionActive(false);
                      setSessionStatus('idle');
                    }}
                 />
               ) : (
                 <div className="flex flex-col items-center">
                    <div className="mb-14 text-center">
                       <h3 className="text-3xl font-black text-white mb-2 italic tracking-tight">Prática Mentorada</h3>
                       <p className="text-slate-500 font-medium text-sm">IA Perceptiva com prática técnica e conversação integrada.</p>
                    </div>

                    <div className="flex justify-center w-full max-w-md">
                       <button
                         disabled={!lessonText}
                         onClick={() => setIsSessionActive(true)}
                         className="group w-full p-10 bg-indigo-600 rounded-[3rem] text-white flex flex-col items-center gap-6 transition-all hover:scale-[1.03] hover:bg-indigo-500 shadow-2xl shadow-indigo-950/40 disabled:opacity-20 disabled:grayscale"
                       >
                         <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-inner">
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                         </div>
                         <div className="text-center">
                            <span className="block font-black text-lg italic mb-1">Iniciar Modo Prática</span>
                            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em] opacity-60">Foco + Conversação</span>
                         </div>
                       </button>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-16 border-t border-slate-900 mt-24">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-slate-600 font-black text-[10px] uppercase tracking-[0.5em]">© Inner Voice Method • 2025</div>
          <div className="flex gap-10">
            <button onClick={() => { if(confirm("Limpar dados?")) { setLessonText(""); localStorage.removeItem('inner_voice_lesson_text'); } }} className="text-slate-700 hover:text-red-900 font-black text-[10px] uppercase tracking-widest transition-colors">System Reset</button>
            <div className="text-slate-500 font-black text-[10px] uppercase tracking-widest italic decoration-indigo-500/50 underline-offset-8 underline">Clareza precede prática</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
