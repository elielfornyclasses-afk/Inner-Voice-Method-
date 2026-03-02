import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { createInviteCode, listInvites } from '../services/invites';
import { InviteCode, SubscriptionPlan } from '../types';

const AdminPanel: React.FC = () => {
  const { user } = useUser();
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Formulário de geração
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('premium');
  const [validityDays, setValidityDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);

  // Carrega convites
  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    setIsLoading(true);
    const data = await listInvites();
    // Ordena por data de criação (mais recente primeiro)
    data.sort((a, b) => b.createdAt - a.createdAt);
    setInvites(data);
    setIsLoading(false);
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
      await loadInvites(); // Recarrega lista
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
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Estatísticas
  const stats = {
    total: invites.length,
    active: invites.filter(i => i.isActive && Date.now() < i.expiresAt).length,
    used: invites.filter(i => i.usedCount >= i.maxUses).length,
    expired: invites.filter(i => Date.now() >= i.expiresAt).length
  };

  return (
    <div className="min-h-screen bg-[#020617] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
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
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Códigos</p>
            <p className="text-3xl font-black text-white">{stats.total}</p>
          </div>
          <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6">
            <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-2">Ativos</p>
            <p className="text-3xl font-black text-green-300">{stats.active}</p>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Usados</p>
            <p className="text-3xl font-black text-blue-300">{stats.used}</p>
          </div>
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6">
            <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">Expirados</p>
            <p className="text-3xl font-black text-red-300">{stats.expired}</p>
          </div>
        </div>

        {/* Gerador de Códigos */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 mb-10">
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
                className="w-full bg-slate-950 border border-slate-700 text-white py-3 px-4 rounded-xl font-bold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="pro">Professional</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Validade (dias)</label>
              <select
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-white py-3 px-4 rounded-xl font-bold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
              >
                <option value={7}>7 dias</option>
                <option value={14}>14 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
                <option value={365}>1 ano</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Usos permitidos</label>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-white py-3 px-4 rounded-xl font-bold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
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
            className="w-full bg-purple-600 text-white py-4 rounded-xl font-black text-lg hover:bg-purple-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {isGenerating ? 'Gerando...' : '🎫 Gerar Código'}
          </button>

          {/* Código Gerado */}
          {generatedCode && (
            <div className="mt-6 bg-green-900/30 border border-green-500/30 rounded-2xl p-6 animate-in fade-in slide-in-from-top-2">
              <p className="text-green-300 font-bold text-sm mb-3">✅ Código gerado com sucesso!</p>
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

        {/* Lista de Códigos */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Códigos Criados
          </h2>

          {isLoading ? (
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
                    className={`border rounded-2xl p-4 ${
                      isAvailable
                        ? 'bg-slate-950 border-slate-700'
                        : 'bg-slate-950/50 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-white font-black text-lg">{invite.code}</p>
                          {isAvailable && (
                            <span className="px-3 py-1 bg-green-900/30 border border-green-500/30 text-green-400 text-xs font-bold rounded-full uppercase">
                              Disponível
                            </span>
                          )}
                          {isUsed && (
                            <span className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full uppercase">
                              Usado
                            </span>
                          )}
                          {isExpired && (
                            <span className="px-3 py-1 bg-red-900/30 border border-red-500/30 text-red-400 text-xs font-bold rounded-full uppercase">
                              Expirado
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                          <span>Plano: <span className="text-white font-bold">{invite.plan}</span></span>
                          <span>Validade: <span className="text-white font-bold">{invite.validityDays}d</span></span>
                          <span>Usos: <span className="text-white font-bold">{invite.usedCount}/{invite.maxUses}</span></span>
                          <span>Expira: <span className="text-white font-bold">{new Date(invite.expiresAt).toLocaleDateString('pt-BR')}</span></span>
                        </div>
                        {invite.usedBy.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-slate-500">Usado por: <span className="text-slate-400">{invite.usedBy.join(', ')}</span></p>
                          </div>
                        )}
                      </div>
                      {isAvailable && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(invite.code)}
                            className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-all"
                          >
                            📋 Copiar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
