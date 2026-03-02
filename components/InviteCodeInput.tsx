import React, { useState } from 'react';
import { validateInviteCode } from '../services/invites';
import { InviteCode } from '../types';

interface InviteCodeInputProps {
  onValidCode: (invite: InviteCode) => void;
}

const InviteCodeInput: React.FC<InviteCodeInputProps> = ({ onValidCode }) => {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const handleValidate = async () => {
    if (!code.trim()) {
      setError('Digite um código');
      return;
    }

    setIsValidating(true);
    setError('');

    const result = await validateInviteCode(code.trim());

    setIsValidating(false);

    if (result.valid && result.invite) {
      onValidCode(result.invite);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-600/20 border-2 border-indigo-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-white mb-2 italic">Código de Convite</h2>
        <p className="text-slate-400 text-sm">Digite o código fornecido pelo seu instrutor</p>
      </div>

      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleValidate()}
            placeholder="IVM-PREM-XXXXX"
            className="w-full bg-slate-950 border border-slate-700 text-white text-center text-lg font-bold py-4 px-6 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-600 uppercase tracking-wider"
            disabled={isValidating}
          />
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 text-sm font-semibold">{error}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleValidate}
          disabled={isValidating || !code.trim()}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-950/40 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? 'Validando...' : 'Validar Código'}
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-800">
        <p className="text-slate-500 text-xs text-center">
          Não tem um código?{' '}
          <a
            href="https://wa.me/5522999999999?text=Olá!%20Gostaria%20de%20obter%20um%20código%20de%20acesso"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 font-bold"
          >
            Entre em contato
          </a>
        </p>
      </div>
    </div>
  );
};

export default InviteCodeInput;
