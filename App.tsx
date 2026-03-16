import React, { useState, useEffect, useRef } from 'react';
import { SignIn, SignUp, UserButton, useUser, useAuth } from '@clerk/clerk-react';
import { DayOfWeek, Subscription, InviteCode } from './types';
import { METHODOLOGY, DEFAULT_LESSON_CONTENT, PEDAGOGICAL_PRINCIPLES } from './constants';
import DaySelector from './components/DaySelector';
import LiveVoiceSession from './components/LiveVoiceSession';
import SubscriptionBadge from './components/SubscriptionBadge';
import InviteCodeInput from './components/InviteCodeInput';
import AdminPanel from './components/AdminPanel';
import { markInviteAsUsed } from './services/invites';
import { getLessonsForStudent, Lesson, LessonLanguage } from './services/lessons';
import { registerPractice, hasPracticedToday } from './services/practice';

const ADMIN_EMAILS = ['elielfornyclasses@gmail.com'];
const isAdmin = (email?: string) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

const App: React.FC = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useAuth();

  const [currentDay, setCurrentDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionMode, setSessionMode] = useState<'practice' | 'free'>('practice');
  const [showAuthModal, setShowAuthModal] = useState<'signin' | 'signup' | 'invite' | null>(null);
  const [subscription, setSubscription] = useState<Subscription | undefined>(undefined);
  const [validatedInvite, setValidatedInvite] = useState<InviteCode | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // — Lições —
  const [lessonLanguage, setLessonLanguage] = useState<LessonLanguage>('english');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  // — Prática —
  const [practicedToday, setPracticedToday] = useState(false);

  // — Device protection —
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const deviceChecked = useRef(false);

  // Carrega lições quando idioma muda ou usuário loga
  useEffect(() => {
    const email = user?.emailAddresses[0]?.emailAddress;
    if (!isSignedIn || !email) return;
    if (isAdmin(email)) return;

    const load = async () => {
      setIsLoadingLessons(true);
      setSelectedLesson(null);
      const data = await getLessonsForStudent(email, lessonLanguage);
      setLessons(data);
      if (data.length > 0) setSelectedLesson(data[0]);
      setIsLoadingLessons(false);
    };
    load();
  }, [isSignedIn, user, lessonLanguage]);

  // Verifica se já praticou hoje
  useEffect(() => {
    const check = async () => {
      const email = user?.emailAddresses[0]?.emailAddress;
      if (!isSignedIn || !email || isAdmin(email)) return;
      const done = await hasPracticedToday(email);
      setPracticedToday(done);
    };
    check();
  }, [isSignedIn, user]);

  useEffect(() => {
    if (user?.publicMetadata?.subscription) {
      setSubscription(user.publicMetadata.subscription as Subscription);
    }
  }, [user]);

  // Verifica dispositivo
  useEffect(() => {
    const checkDevice = async () => {
      if (!isSignedIn || !user || deviceChecked.current) return;
      if (isAdmin(user.emailAddresses[0]?.emailAddress)) return;
      if (!user.publicMetadata?.subscription) return;

      deviceChecked.current = true;
      let deviceId = localStorage.getItem('ivm_device_id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('ivm_device_id', deviceId);
      }

      try {
        const res = await fetch('/api/update-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, deviceId, action: 'check' }),
        });
        const data = await res.json();
        if (!data.allowed) setDeviceBlocked(true);
      } catch (err) {
        console.error('Erro ao verificar dispositivo:', err);
      }
    };
    checkDevice();
  }, [isSignedIn, user]);

  // Detecta painel admin pela URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin' && isSignedIn && user) {
      const userEmail = user.emailAddresses[0]?.emailAddress;
      if (isAdmin(userEmail)) {
        setShowAdminPanel(true);
      } else {
        window.location.href = '/';
      }
    }
  }, [isSignedIn, user]);

  // Ativa assinatura após cadastro
  useEffect(() => {
    const activateSubscription = async () => {
      let invite = validatedInvite;
      if (!invite) {
        const pending = sessionStorage.getItem('pendingInvite');
        if (pending) {
          try { invite = JSON.parse(pending); } catch { sessionStorage.removeItem('pendingInvite'); }
        }
      }

      if (isSignedIn && user && invite && !user.publicMetadata?.subscription) {
        try {
          const now = Date.now();
          const expiresAt = now + (invite.validityDays * 24 * 60 * 60 * 1000);
          const subscriptionData = { plan: invite.plan, status: 'active' as const, expiresAt, startedAt: now };

          const response = await fetch('/api/activate-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, plan: invite.plan, validityDays: invite.validityDays }),
          });
          if (!response.ok) throw new Error('Falha ao ativar assinatura');

          await markInviteAsUsed(invite.code, user.emailAddresses[0]?.emailAddress || '');

          let deviceId = localStorage.getItem('ivm_device_id');
          if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('ivm_device_id', deviceId);
          }
          await fetch('/api/update-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, deviceId, action: 'claim' }),
          });

          setSubscription(subscriptionData);
          setValidatedInvite(null);
          sessionStorage.removeItem('pendingInvite');
        } catch (error) {
          console.error('❌ Erro ao ativar assinatura:', error);
        }
      }
    };
    activateSubscription();
  }, [isSignedIn, user, validatedInvite]);

  const handleValidCode = (invite: InviteCode) => {
    setValidatedInvite(invite);
    sessionStorage.setItem('pendingInvite', JSON.stringify(invite));
    setShowAuthModal('signup');
  };

  const handleClaimDevice = async () => {
    const deviceId = localStorage.getItem('ivm_device_id') || crypto.randomUUID();
    localStorage.setItem('ivm_device_id', deviceId);
    await fetch('/api/update-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, deviceId, action: 'claim' }),
    });
    setDeviceBlocked(false);
    deviceChecked.current = false;
  };

  const currentMethod = METHODOLOGY.find((m) => m.day === currentDay)!;
  const lessonText = selectedLesson?.content || '';

  const clerkAppearance = {
    elements: {
      rootBox: 'w-full', card: 'shadow-none bg-transparent',
      headerTitle: 'text-white font-black text-xl', headerSubtitle: 'text-slate-400',
      formFieldInput: 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-600',
      formFieldLabel: 'text-slate-300 font-bold text-xs uppercase tracking-wider',
      formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/30',
      socialButtonsBlockButton: 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700',
      socialButtonsBlockButtonText: 'text-white font-semibold',
      footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-bold',
      dividerLine: 'bg-slate-700', dividerText: 'text-slate-500',
      formFieldInputShowPasswordButton: 'text-slate-400 hover:text-white',
      identityPreviewText: 'text-slate-300', identityPreviewEditButton: 'text-indigo-400 hover:text-indigo-300',
      formResendCodeLink: 'text-indigo-400 hover:text-indigo-300',
      otpCodeFieldInput: 'bg-slate-950 border-slate-700 text-white',
    },
  };

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

  if (showAdminPanel && isSignedIn && isAdmin(user?.emailAddresses[0]?.emailAddress)) {
    return (
      <div>
        <header className="bg-slate-950/80 border-b border-slate-900 sticky top-0 z-50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => { setShowAdminPanel(false); window.history.pushState({}, '', '/'); }} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <h1 className="text-sm font-black tracking-wide text-white uppercase">Painel Admin</h1>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <AdminPanel />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl mx-auto mb-6 shadow-lg shadow-indigo-900/40">IV</div>
            <h1 className="text-3xl font-black text-white mb-2 italic tracking-tight">Inner Voice Method</h1>
            <p className="text-slate-500 font-medium text-sm uppercase tracking-widest">Trainer Professional</p>
          </div>

          {showAuthModal === 'signin' && (
            <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SignIn appearance={clerkAppearance} fallbackRedirectUrl="/" />
              <button onClick={() => setShowAuthModal('invite')} className="w-full mt-6 text-sm text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest transition-colors">
                Não tem conta? Criar conta
              </button>
            </div>
          )}
          {showAuthModal === 'invite' && <InviteCodeInput onValidCode={handleValidCode} />}
          {showAuthModal === 'signup' && validatedInvite && (
            <div className="space-y-4">
              <div className="bg-green-900/30 border border-green-500/30 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div className="flex-1">
                    <p className="text-green-300 font-bold text-sm">Código validado!</p>
                    <p className="text-green-400/80 text-xs mt-0.5">Plano {validatedInvite.plan} • {validatedInvite.validityDays} dias</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SignUp appearance={clerkAppearance} fallbackRedirectUrl="/" />
                <button onClick={() => { setShowAuthModal('signin'); setValidatedInvite(null); }} className="w-full mt-6 text-sm text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest transition-colors">
                  Já tem conta? Entrar
                </button>
              </div>
            </div>
          )}
          {!showAuthModal && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
              <button onClick={() => setShowAuthModal('signin')} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-950/40 uppercase tracking-wider">Entrar</button>
              <button onClick={() => setShowAuthModal('invite')} className="w-full bg-slate-900 text-indigo-400 py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all border-2 border-slate-800 uppercase tracking-wider">Criar Conta</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Bloqueio por dispositivo
  if (isSignedIn && deviceBlocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl p-10">
            <div className="w-20 h-20 bg-orange-900/30 border-2 border-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" /></svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-3 italic">Conta em Uso</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">Esta conta está sendo acessada em outro dispositivo. Deseja usar o app aqui?</p>
            <div className="space-y-3">
              <button onClick={handleClaimDevice} className="block w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-950/40 uppercase tracking-wider">📱 Usar neste dispositivo</button>
              <button onClick={() => signOut()} className="block w-full bg-slate-800 text-slate-400 py-3 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all uppercase tracking-wider">Sair</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bloqueio por assinatura expirada
  if (isSignedIn && subscription) {
    const isExpired = subscription.status === 'expired' || (subscription.expiresAt && subscription.expiresAt < Date.now());
    if (isExpired) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl p-10">
              <div className="w-20 h-20 bg-red-900/30 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h2 className="text-2xl font-black text-white mb-3 italic">Assinatura Expirada</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">Sua assinatura expirou em <span className="text-red-400 font-bold">{new Date(subscription.expiresAt!).toLocaleDateString('pt-BR')}</span>. Entre em contato para renovar!</p>
              <div className="space-y-3">
                <a href="https://wa.me/5522999999999?text=Olá!%20Gostaria%20de%20renovar%20minha%20assinatura" target="_blank" rel="noopener noreferrer" className="block w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-green-500 transition-all shadow-2xl shadow-green-950/40 uppercase tracking-wider">💬 Falar no WhatsApp</a>
                <button onClick={() => signOut()} className="block w-full bg-slate-800 text-slate-400 py-3 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all uppercase tracking-wider">Sair</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Bloqueio sem assinatura
  if (isSignedIn && !subscription && !isAdmin(user?.emailAddresses[0]?.emailAddress)) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl p-10">
            <div className="w-20 h-20 bg-yellow-900/30 border-2 border-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-3 italic">Acesso Restrito</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">Você precisa de um código de convite para acessar o app. Entre em contato com seu instrutor!</p>
            <div className="space-y-3">
              <a href="https://wa.me/5521993406428?text=Olá!%20Gostaria%20de%20obter%20um%20código%20de%20acesso" target="_blank" rel="noopener noreferrer" className="block w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-green-500 transition-all shadow-2xl shadow-green-950/40 uppercase tracking-wider">💬 Falar no WhatsApp</a>
              <button onClick={() => signOut()} className="block w-full bg-slate-800 text-slate-400 py-3 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all uppercase tracking-wider">Sair</button>
            </div>
          </div>
        </div>
      </div>
    );
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
            {isAdmin(user?.emailAddresses[0]?.emailAddress) && (
              <button onClick={() => { setShowAdminPanel(true); window.history.pushState({}, '', '/admin'); }} className="text-[10px] font-bold bg-purple-900/30 text-purple-400 px-4 py-2 rounded-lg hover:bg-purple-800/30 transition-colors uppercase tracking-widest border border-purple-500/30">🎛️ Admin</button>
            )}
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-10 h-10 rounded-xl border-2 border-slate-800' } }} />
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
                <p className="text-slate-500 font-medium">Aluno: <span className="text-indigo-400 font-black">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span></p>
                <SubscriptionBadge subscription={subscription} />
              </div>
            </div>
            <DaySelector currentDay={currentDay} onSelect={setCurrentDay} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Coluna esquerda */}
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
                  {currentDay === DayOfWeek.MONDAY && '🎧'}
                  {currentDay === DayOfWeek.TUESDAY && '🥁'}
                  {currentDay === DayOfWeek.WEDNESDAY && '🗣️'}
                  {currentDay === DayOfWeek.THURSDAY && '🚀'}
                  {currentDay === DayOfWeek.FRIDAY && '🌟'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{currentDay}</h3>
                  <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">{currentMethod.title}</p>
                </div>
              </div>
              <div className="space-y-6">
                {currentMethod.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-5 items-start">
                    <div className="mt-1 w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-500 shadow-inner">{idx + 1}</div>
                    <p className="text-slate-400 text-sm leading-relaxed font-semibold">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna direita */}
          <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">

            {/* Seletor de idioma + lições */}
            <div className="bg-slate-900/40 rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden">
              <div className="px-10 py-6 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
                <h3 className="font-black text-slate-300 text-[10px] tracking-[0.3em] uppercase flex items-center gap-3">
                  <span className="w-2 h-4 bg-indigo-600 rounded-full"></span>
                  Material de Estudo
                </h3>
                <div className="flex gap-2">
                  {(['english', 'french'] as LessonLanguage[]).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setLessonLanguage(lang)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                        lessonLanguage === lang
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {lang === 'english' ? '🇬🇧 Inglês' : '🇫🇷 Francês'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex" style={{ minHeight: '350px' }}>
                {lessons.length > 1 && (
                  <div className="w-48 border-r border-slate-800 p-4 space-y-2 overflow-y-auto max-h-[500px]">
                    {lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson)}
                        className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                          selectedLesson?.id === lesson.id
                            ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <p className="text-[10px] font-black uppercase tracking-wider truncate">{lesson.title}</p>
                        <p className="text-[9px] mt-1 opacity-60">
                          {new Date(lesson.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex-1 p-12">
                  {isLoadingLessons ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-10 h-10 border-4 border-slate-800 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  ) : selectedLesson ? (
                    <div>
                      <div className="mb-6">
                        <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-1">{selectedLesson.date ? new Date(selectedLesson.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</p>
                        <h4 className="text-white font-black text-xl italic">{selectedLesson.title}</h4>
                      </div>
                      <div className="prose prose-invert max-w-none">
                        {selectedLesson.content.split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className="text-slate-300 text-xl leading-relaxed mb-8 font-medium tracking-tight last:mb-0">{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <div className="w-24 h-24 bg-slate-950 rounded-[2rem] flex items-center justify-center text-slate-800 border border-slate-800 mb-8 shadow-inner">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      </div>
                      <p className="text-slate-600 font-bold text-[11px] uppercase tracking-[0.4em] mb-2">Nenhuma lição disponível</p>
                      <p className="text-slate-700 text-sm">Aguarde seu instrutor enviar a próxima lição.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sessão de prática */}
            <div className={`bg-slate-900/30 p-12 rounded-[4rem] border border-slate-800 shadow-2xl relative overflow-hidden transition-all ${!lessonText ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              {isSessionActive ? (
                <LiveVoiceSession
                  day={currentDay}
                  lessonContent={lessonText}
                  lessonLanguage={lessonLanguage}
                  mode={sessionMode}
                  onStatusChange={setSessionStatus}
                  onClose={() => { setIsSessionActive(false); setSessionStatus('idle'); }}
                  onPracticeComplete={async () => {
                    const email = user?.emailAddresses[0]?.emailAddress;
                    if (email) {
                      await registerPractice(email);
                      setPracticedToday(true);
                    }
                  }}
                />
              ) : (
                <div className="flex flex-col items-center">
                  <div className="mb-14 text-center">
                    <h3 className="text-3xl font-black text-white mb-2 italic tracking-tight">Prática Mentorada</h3>
                    <p className="text-slate-500 font-medium text-sm">IA Perceptiva com prática técnica e conversação integrada.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
                    {/* Botão Prática */}
                    <button
                      disabled={!lessonText}
                      onClick={() => { setSessionMode('practice'); setIsSessionActive(true); }}
                      className="group flex-1 p-10 bg-indigo-600 rounded-[3rem] text-white flex flex-col items-center gap-6 transition-all hover:scale-[1.03] hover:bg-indigo-500 shadow-2xl shadow-indigo-950/40 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                    >
                      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-inner">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </div>
                      <div className="text-center">
                        <span className="block font-black text-lg italic mb-1">Iniciar Modo Prática</span>
                        <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em] opacity-60">Foco + Conversação</span>
                      </div>
                    </button>

                    {/* Botão Fala Livre — sempre visível, bloqueado até praticar */}
                    <button
                      disabled={!lessonText || !practicedToday}
                      onClick={() => { setSessionMode('free'); setIsSessionActive(true); }}
                      className="group flex-1 p-10 bg-emerald-900/40 rounded-[3rem] text-white flex flex-col items-center gap-6 transition-all hover:scale-[1.03] hover:bg-emerald-800/40 shadow-2xl border border-emerald-500/20 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                    >
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-inner">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      </div>
                      <div className="text-center">
                        <span className="block font-black text-lg italic mb-1 text-emerald-300">Fala Livre</span>
                        <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-[0.2em]">
                          {practicedToday ? 'Conversação Expandida' : 'Conclua a prática primeiro'}
                        </span>
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
          <div className="text-slate-500 font-black text-[10px] uppercase tracking-widest italic decoration-indigo-500/50 underline-offset-8 underline">Clareza precede prática</div>
        </div>
      </footer>
    </div>
  );
};

export default App;
