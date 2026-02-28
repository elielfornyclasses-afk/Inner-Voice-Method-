import React from 'react';
import { Subscription } from '../types';

interface SubscriptionBadgeProps {
  subscription?: Subscription;
}

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ subscription }) => {
  if (!subscription) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl">
        <span className="w-2 h-2 rounded-full bg-slate-600"></span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sem Plano</span>
      </div>
    );
  }

  const { plan, status, expiresAt } = subscription;

  // Calcula dias restantes
  const daysRemaining = expiresAt ? Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = status === 'expired' || (daysRemaining !== null && daysRemaining <= 0);

  // Cores por plano
  const planColors = {
    free: {
      bg: 'bg-slate-800',
      border: 'border-slate-700',
      text: 'text-slate-400',
      dot: 'bg-slate-500'
    },
    premium: {
      bg: 'bg-indigo-900/30',
      border: 'border-indigo-500/30',
      text: 'text-indigo-400',
      dot: 'bg-indigo-500'
    },
    pro: {
      bg: 'bg-purple-900/30',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      dot: 'bg-purple-500'
    }
  };

  const colors = planColors[plan] || planColors.free;

  // Labels
  const planLabels = {
    free: 'Plano Gratuito',
    premium: 'Premium',
    pro: 'Professional'
  };

  return (
    <div className="space-y-3">
      {/* Badge do plano */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 ${colors.bg} border ${colors.border} rounded-xl shadow-lg`}>
        <span className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`}></span>
        <span className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}>
          {planLabels[plan]}
        </span>
      </div>

      {/* Aviso de expiração */}
      {isExpired && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-red-300 font-bold text-sm">Assinatura Expirada</p>
              <p className="text-red-400/80 text-xs mt-1">Renove sua assinatura para continuar acessando todos os recursos.</p>
            </div>
          </div>
        </div>
      )}

      {isExpiringSoon && !isExpired && (
        <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-yellow-300 font-bold text-sm">
                {daysRemaining === 1 ? 'Expira amanhã!' : `Expira em ${daysRemaining} dias`}
              </p>
              <p className="text-yellow-400/80 text-xs mt-1">Renove em breve para não perder o acesso.</p>
            </div>
          </div>
        </div>
      )}

      {/* Info de validade */}
      {!isExpired && expiresAt && (
        <p className="text-slate-500 text-xs font-medium">
          Válido até: <span className="text-slate-400 font-bold">{new Date(expiresAt).toLocaleDateString('pt-BR')}</span>
        </p>
      )}
    </div>
  );
};

export default SubscriptionBadge;
