
import React, { useState, useEffect } from 'react';
import { AccessCode } from '../types';
import { PERMANENT_KEYS, AUTHORIZED_CODES } from '../constants';

interface AccessControlProps {
  onAccessGranted: (code: string) => void;
  onLogout: () => void;
}

const ADMIN_PASSWORD = "MEU-METODO-2025"; 

const AccessControl: React.FC<AccessControlProps> = ({ onAccessGranted, onLogout }) => {
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [newCodeKey, setNewCodeKey] = useState('');
  const [newCodeDays, setNewCodeDays] = useState('30');
  const [newCodeDesc, setNewCodeDesc] = useState('');

  useEffect(() => {
    const savedCodesRaw = localStorage.getItem('inner_voice_access_codes');
    let localCodes: AccessCode[] = savedCodesRaw ? JSON.parse(savedCodesRaw) : [];
    const filteredLocal = localCodes.filter(lc => !PERMANENT_KEYS.includes(lc.key));
    setCodes([...AUTHORIZED_CODES, ...filteredLocal]);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const typed = inputCode.trim().toUpperCase();

    if (PERMANENT_KEYS.includes(typed)) {
      setError('');
      onAccessGranted(typed);
      return;
    }

    const code = codes.find(c => c.key === typed);
    
    if (!code) {
      setError('Acesso negado. Verifique o código.');
      return;
    }

    if (!code.isActive) {
      setError('Este código foi desativado.');
      return;
    }

    if (Date.now() > code.expiry) {
      setError('Assinatura expirada.');
      return;
    }

    setError('');
    onAccessGranted(code.key);
  };

  const openAdminPanel = () => {
    setIsAdminAuthenticated(false);
    setAdminPass('');
    setShowAdmin(true);
  };

  const closeAdminPanel = () => {
    setIsAdminAuthenticated(false);
    setAdminPass('');
    setShowAdmin(false);
  };

  const handleCreateCode = () => {
    if (!newCodeKey) return;
    const expiry = Date.now() + (parseInt(newCodeDays) * 24 * 60 * 60 * 1000);
    const newKey = newCodeKey.toUpperCase();

    if (PERMANENT_KEYS.includes(newKey)) {
        alert("Este código já existe como Chave Mestra.");
        return;
    }

    const newCode: AccessCode = {
      key: newKey,
      expiry,
      createdAt: Date.now(),
      description: newCodeDesc || 'Aluno Local',
      isActive: true
    };
    
    const savedCodesRaw = localStorage.getItem('inner_voice_access_codes');
    let currentLocal: AccessCode[] = savedCodesRaw ? JSON.parse(savedCodesRaw) : [];
    const updated = [...currentLocal, newCode];
    
    localStorage.setItem('inner_voice_access_codes', JSON.stringify(updated));
    setCodes([...AUTHORIZED_CODES, ...updated]);
    setNewCodeKey('');
    setNewCodeDesc('');
  };

  const deleteCode = (key: string) => {
    if(confirm('Excluir?')) {
        const savedCodesRaw = localStorage.getItem('inner_voice_access_codes');
        let currentLocal: AccessCode[] = savedCodesRaw ? JSON.parse(savedCodesRaw) : [];
        const updated = currentLocal.filter(c => c.key !== key);
        localStorage.setItem('inner_voice_access_codes', JSON.stringify(updated));
        setCodes([...AUTHORIZED_CODES, ...updated]);
    }
  };

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans">
        <div className="bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[650px] border border-slate-800">
          <div className="w-full md:w-80 bg-slate-950 p-10 border-r border-slate-800 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black text-white italic mb-10">Admin Panel</h2>
              {!isAdminAuthenticated ? (
                <div className="space-y-6">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Senha Mestra</p>
                  <input 
                    autoFocus
                    type="password" 
                    value={adminPass} 
                    onChange={e => setAdminPass(e.target.value)} 
                    onKeyDown={(e) => { if(e.key === 'Enter') adminPass === ADMIN_PASSWORD ? setIsAdminAuthenticated(true) : alert('Senha Incorreta') }}
                    className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500" 
                  />
                  <button onClick={() => adminPass === ADMIN_PASSWORD ? setIsAdminAuthenticated(true) : alert('Senha Incorreta')} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-900/40">Entrar</button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="p-5 bg-indigo-950/30 rounded-2xl border border-indigo-900/30">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-4 tracking-widest italic">Novo Acesso Local</p>
                    <input placeholder="Ex: ALUNO-VIP" value={newCodeKey} onChange={e => setNewCodeKey(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm mb-3 text-white" />
                    <button onClick={handleCreateCode} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Gerar</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={closeAdminPanel} className="text-slate-600 hover:text-white text-[10px] font-black uppercase text-center tracking-widest transition-colors">Voltar</button>
          </div>
          
          <div className="flex-1 p-10 overflow-y-auto bg-slate-900">
            {isAdminAuthenticated ? (
              <>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-8 italic">Chaves de Acesso Ativas</h3>
                <div className="grid grid-cols-1 gap-4">
                  {codes.map(c => {
                    const isMaster = PERMANENT_KEYS.includes(c.key);
                    return (
                      <div key={c.key} className={`p-6 border rounded-3xl flex items-center justify-between transition-all ${isMaster ? 'bg-indigo-950/20 border-indigo-500/20' : 'bg-slate-950/40 border-slate-800'}`}>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-white tracking-widest">{c.key}</span>
                            {isMaster && <span className="text-[7px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase italic">MASTER</span>}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-widest">{isMaster ? 'Definido via Netlify' : `Local • ${new Date(c.expiry).toLocaleDateString()}`}</p>
                        </div>
                        {!isMaster && (
                          <button onClick={() => deleteCode(c.key)} className="text-[10px] font-black text-red-400/50 hover:text-red-400 p-2 uppercase tracking-widest">Remover</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                 <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-[0.5em]">Aguardando Autenticação</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-14">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-indigo-900/50 mx-auto mb-8 italic border border-indigo-400/20">IV</div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-[0.2em]">Inner Voice <span className="text-indigo-500 italic">Method</span></h1>
          <p className="text-slate-500 font-bold mt-3 text-xs uppercase tracking-[0.4em] opacity-60">Alinhamento Perceptivo</p>
        </div>

        <div className="bg-slate-900/50 p-12 rounded-[4rem] shadow-2xl border border-slate-800 backdrop-blur-sm">
          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 text-center">Identificação do Aluno</label>
              <input 
                autoFocus
                type="text"
                placeholder="CÓDIGO"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full p-6 bg-slate-950 border border-slate-800 rounded-[2rem] outline-none focus:ring-1 ring-indigo-500/50 text-center font-black tracking-[0.5em] text-white placeholder:text-slate-800 transition-all uppercase text-lg shadow-inner"
              />
            </div>

            {error && <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-2xl text-red-500 text-[10px] font-black text-center uppercase tracking-widest italic">{error}</div>}

            <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-950 hover:bg-indigo-500 transition-all active:scale-[0.98]">
              Acessar Mentor
            </button>
          </form>
        </div>

        <div className="mt-16 text-center opacity-20 hover:opacity-100 transition-all duration-500">
           <button onClick={openAdminPanel} className="text-[10px] font-black text-slate-600 hover:text-indigo-400 uppercase tracking-[0.3em]">Administrator</button>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
