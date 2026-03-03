import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { createInviteCode, listInvites } from '../services/invites';
import { InviteCode, SubscriptionPlan } from '../types';

interface ClerkUser {
  id: string;
  email_addresses: { email_address: string }[];
  first_name: string | null;
  last_name: string | null;
  created_at: number;
  public_metadata: {
    subscription?: {
      plan: string;
      status: string;
      expiresAt: number;
      startedAt: number;
    };
  };
}

const AdminPanel: React.FC = () => {
  const { user } = useUser();

  // — Convites —
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('premium');
  const [validityDays, setValidityDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);

  // — Usuários —
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users');

  // — Renovação —
  const [renewDays, setRenewDays] = useState<{ [userId: string]: number }>({});
  const [renewPlan, setRenewPlan] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    loadInvites();
    loadUsers();
  }, []);

  const loadInvites = async () => {
    setIsLoadingInvites(true);
    const data = await listInvites();
    data.sort((a, b) => b.createdAt - a.createdAt);
    setInvites(data);
    setIsLoadingInvites(false);
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/clerk-users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
    setIsLoadingUsers(false);
  };

  const handleUserAction = async (
    userId: string,
    action: 'activate' | 'renew' | 'block' | 'unblock',
    plan?: string,
    days?: number
  ) => {
    setActionLoading(`${userId}-${action}`);
    try {
      const res = await fetch('/api/clerk-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, plan, days }),
      });
      if (res.ok) {
        await loadUsers();
      } else {
        alert('Erro ao executar ação. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao executar ação.');
    }
    setActionLoading(null);
  };

  const handleGenerateCode = async () => {
    if (!user?.emailAddresses[0]?.emailAddress) return;
    setIsGenerating(true);
    try {
      const invite = await createInviteCode(
        selectedPlan,
        validityDays,
        maxUses,
        user.emailAddresses[0].emailAddress
      );
      setGeneratedCode(invite.code);
      await loadInvites();
    } catch (error) {
      console.error('Erro ao gerar código:', error);
      alert('Erro ao gerar código. Tente novamente.');
    }
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Código copiado!');
  };

  const shareOnWhatsApp = (code: string) => {
    const message = `Olá! Aqui está seu código de acesso ao Inner Voice Method:\n\n*${code}*\n\nUse este código ao criar sua conta no app! 🎉`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getUserStatus = (u: ClerkUser) => {
    const sub = u.public_metadata?.subscription;
    if (!sub) return { label: 'Sem Plano', color: 'slate' };
    if (sub.status === 'blocked') return { label: 'Bloqueado', color: 'red' };
    if (sub.expiresAt < Date.now()) return { label: 'Expirado', color: 'orange' };
    const daysLeft = Math.ceil((sub.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) return { label: `Expira em ${daysLeft}d`, color: 'yellow' };
    return { label: `${sub.plan} • ${daysLeft}d`, color: 'green' };
  };

  const stats = {
    total: invites.length,
    active: invites.filter(i => i.isActive && Date.now() < i.expiresAt).length,
    used: invites.filter(i => i.usedCount >= i.maxUses).length,
    expired: invites.filter(i => Date.now() >= i.expiresAt).length,
    totalUsers: users.length,
    activeUsers: users.filter(u => {
      const sub = u.public_metadata?.subscription;
      return sub && sub.status === 'active' && sub.expiresAt > Date.now();
    }).length,
  };

  const colorMap: Record<string, string> = {
    green: 'bg-green-900/30 border-green-500/30 text-green-400',
    yellow: 'bg-yellow-900/30 border-yellow-500/30 text-yellow-400',
    orange: 'bg-orange-900/30 border-orange-500/30 text-orange-400',
    red: 'bg-red-900/30 border-red-500/30 text-red-400',
    slate: 'bg-slate-800/50 border-slate-700 text-slate-400',
  };

  return (
    <div className="min-h-screen bg-[#020617] py-12 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white italic">Painel Admin</h1>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Inner Voice Method</p>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Alunos</p>
            <p className="text-3xl font-black text-white">{stats.totalUsers}</p>
          </div>
          <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6">
            <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-2">Ativos</p>
            <p className="text-3xl font-black text-green-300">{stats.activeUsers}</p>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Códigos Usados</p>
            <p className="text-3xl font-black text-blue-300">{stats.used}</p>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-6">
            <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">Códigos Ativos</p>
            <p className="text-3xl font-black text-purple-300">{stats.active}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'bg-slate-900/50 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            👥 Alunos
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
              activeTab === 'invites'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'bg-slate-900/50 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🎫 Convites
          </button>
        </div>

        {/* TAB: ALUNOS */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Alunos Cadastrados
              </h2>
              <button
                onClick={loadUsers}
                className="text-xs font-bold text-slate-400 hover:text-white px-4 py-2 bg-slate-800 rounded-lg transition-all"
              >
                🔄 Atualizar
              </button>
            </div>

            {isLoadingUsers ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-slate-700 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500">Carregando alunos...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">Nenhum aluno cadastrado ainda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((u) => {
                  const sub = u.public_metadata?.subscription;
                  const status = getUserStatus(u);
                  const email = u.email_addresses[0]?.email_address || '';
                  const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || email;
                  const isBlocked = sub?.status === 'blocked';
                  const userRenewDays = renewDays[u.id] || 30;
                  const userRenewPlan = renewPlan[u.id] || sub?.plan || 'premium';

                  return (
                    <div key={u.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-white font-black">{name}</p>
                            <span className={`px-3 py-1 border text-xs font-bold rounded-full uppercase ${colorMap[status.color]}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="text-slate-500 text-sm">{email}</p>
                          {sub && (
                            <p className="text-slate-600 text-xs mt-1">
                              Desde: {new Date(sub.startedAt).toLocaleDateString('pt-BR')}
                              {' • '}
                              Expira: {new Date(sub.expiresAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col gap-2 min-w-[240px]">
                          {/* Sem plano: ativar */}
                          {!sub && (
                            <div className="flex gap-2">
                              <select
                                value={userRenewPlan}
                                onChange={(e) => setRenewPlan(prev => ({ ...prev, [u.id]: e.target.value }))}
                                className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs py-2 px-3 rounded-lg"
                              >
                                <option value="free">Free</option>
                                <option value="premium">Premium</option>
                                <option value="pro">Pro</option>
                              </select>
                              <select
                                value={userRenewDays}
                                onChange={(e) => setRenewDays(prev => ({ ...prev, [u.id]: Number(e.target.value) }))}
                                className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs py-2 px-3 rounded-lg"
                              >
                                <option value={7}>7 dias</option>
                                <option value={14}>14 dias</option>
                                <option value={30}>30 dias</option>
                                <option value={90}>90 dias</option>
                              </select>
                              <button
                                disabled={actionLoading === `${u.id}-activate`}
                                onClick={() => handleUserAction(u.id, 'activate', userRenewPlan, userRenewDays)}
                                className="px-3 py-2 bg-green-600 text-white text-xs font-black rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 whitespace-nowrap"
                              >
                                {actionLoading === `${u.id}-activate` ? '...' : '⚡ Ativar'}
                              </button>
                            </div>
                          )}

                          {/* Com plano: renovar */}
                          {sub && !isBlocked && (
                            <div className="flex gap-2">
                              <select
                                value={userRenewDays}
                                onChange={(e) => setRenewDays(prev => ({ ...prev, [u.id]: Number(e.target.value) }))}
                                className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs py-2 px-3 rounded-lg"
                              >
                                <option value={7}>+7 dias</option>
                                <option value={14}>+14 dias</option>
                                <option value={30}>+30 dias</option>
                                <option value={90}>+90 dias</option>
                              </select>
                              <button
                                disabled={actionLoading === `${u.id}-renew`}
                                onClick={() => handleUserAction(u.id, 'renew', userRenewPlan, userRenewDays)}
                                className="px-3 py-2 bg-indigo-600 text-white text-xs font-black rounded-lg hover:bg-indigo-500 transition-all disabled:opacity-50 whitespace-nowrap"
                              >
                                {actionLoading === `${u.id}-renew` ? '...' : '🔄 Renovar'}
                              </button>
                            </div>
                          )}

                          {/* Bloquear / Desbloquear */}
                          {sub && (
                            <button
                              disabled={actionLoading === `${u.id}-block` || actionLoading === `${u.id}-unblock`}
                              onClick={() => handleUserAction(u.id, isBlocked ? 'unblock' : 'block')}
                              className={`w-full py-2 text-xs font-black rounded-lg transition-all disabled:opacity-50 ${
                                isBlocked
                                  ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-500/30'
                                  : 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-500/30'
                              }`}
                            >
                              {actionLoading === `${u.id}-block` || actionLoading === `${u.id}-unblock`
                                ? '...'
                                : isBlocked ? '✅ Desbloquear' : '🚫 Bloquear'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: CONVITES */}
        {activeTab === 'invites' && (
          <div className="space-y-8">
            {/* Gerador */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Gerar Novo Código
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Plano</label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value as SubscriptionPlan)}
                    className="w-full bg-slate-950 border border-slate-700 text-white py-3 px-4 rounded-xl font-bold focus:border-purple-500 outline-none"
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                    <option value="pro">Professional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Validade</label>
                  <select
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-white py-3 px-4 rounded-xl font-bold focus:border-purple-500 outline-none"
                  >
                    <option value={7}>7 dias</option>
                    <option value={14}>14 dias</option>
                    <option value={30}>30 dias</option>
                    <option value={90}>90 dias</option>
                    <option value={365}>1 ano</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Usos</label>
                  <select
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-white py-3 px-4 rounded-xl font-bold focus:border-purple-500 outline-none"
                  >
                    <option value={1}>1 uso</option>
                    <option value={5}>5 usos</option>
                    <option value={10}>10 usos</option>
                    <option value={50}>50 usos</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateCode}
                disabled={isGenerating}
                className="w-full bg-purple-600 text-white py-4 rounded-xl font-black text-lg hover:bg-purple-500 transition-all shadow-lg disabled:opacity-50 uppercase tracking-wider"
              >
                {isGenerating ? 'Gerando...' : '🎫 Gerar Código'}
              </button>

              {generatedCode && (
                <div className="mt-6 bg-green-900/30 border border-green-500/30 rounded-2xl p-6 animate-in fade-in slide-in-from-top-2">
                  <p className="text-green-300 font-bold text-sm mb-3">✅ Código gerado!</p>
                  <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 mb-4">
                    <p className="text-white text-2xl font-black text-center tracking-widest">{generatedCode}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => copyToClipboard(generatedCode)}
                      className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-all"
                    >
                      📋 Copiar
                    </button>
                    <button
                      onClick={() => shareOnWhatsApp(generatedCode)}
                      className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-500 transition-all"
                    >
                      💬 WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de códigos */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Códigos Criados
              </h2>

              {isLoadingInvites ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-slate-700 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-500">Carregando...</p>
                </div>
              ) : invites.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">Nenhum código criado ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invites.map((invite, idx) => {
                    const isExpired = Date.now() >= invite.expiresAt;
                    const isUsed = invite.usedCount >= invite.maxUses;
                    const isAvailable = !isExpired && !isUsed && invite.isActive;

                    return (
                      <div
                        key={idx}
                        className={`border rounded-2xl p-4 ${isAvailable ? 'bg-slate-950 border-slate-700' : 'bg-slate-950/50 border-slate-800 opacity-60'}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="text-white font-black text-lg">{invite.code}</p>
                              {isAvailable && <span className="px-3 py-1 bg-green-900/30 border border-green-500/30 text-green-400 text-xs font-bold rounded-full uppercase">Disponível</span>}
                              {isUsed && <span className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full uppercase">Usado</span>}
                              {isExpired && <span className="px-3 py-1 bg-red-900/30 border border-red-500/30 text-red-400 text-xs font-bold rounded-full uppercase">Expirado</span>}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                              <span>Plano: <span className="text-white font-bold">{invite.plan}</span></span>
                              <span>Validade: <span className="text-white font-bold">{invite.validityDays}d</span></span>
                              <span>Usos: <span className="text-white font-bold">{invite.usedCount}/{invite.maxUses}</span></span>
                              <span>Expira: <span className="text-white font-bold">{new Date(invite.expiresAt).toLocaleDateString('pt-BR')}</span></span>
                            </div>
                            {(invite.usedBy ?? []).length > 0 && (
                              <p className="text-xs text-slate-500 mt-2">Usado por: <span className="text-slate-400">{invite.usedBy.join(', ')}</span></p>
                            )}
                          </div>
                          {isAvailable && (
                            <button
                              onClick={() => copyToClipboard(invite.code)}
                              className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-all"
                            >
                              📋 Copiar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
