import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { InviteCode, SubscriptionPlan } from '../types';

// Gera código único
export const generateCode = (plan: SubscriptionPlan): string => {
  const prefix = 'IVM';
  const planCode = plan.toUpperCase().substring(0, 4);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${planCode}-${random}`;
};

// Cria novo código de convite
export const createInviteCode = async (
  plan: SubscriptionPlan,
  validityDays: number,
  maxUses: number = 1,
  createdBy: string
): Promise<InviteCode> => {
  const code = generateCode(plan);
  const now = Date.now();
  const expiresAt = now + (validityDays * 24 * 60 * 60 * 1000);

  const invite: InviteCode = {
    code,
    plan,
    validityDays,
    maxUses,
    usedCount: 0,
    createdAt: now,
    expiresAt,
    isActive: true,
    usedBy: [],
    createdBy
  };

  await addDoc(collection(db, 'invites'), invite);
  return invite;
};

// Valida código de convite
export const validateInviteCode = async (code: string): Promise<{
  valid: boolean;
  message: string;
  invite?: InviteCode;
}> => {
  try {
    const q = query(collection(db, 'invites'), where('code', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { valid: false, message: 'Código inválido' };
    }

    const inviteDoc = snapshot.docs[0];
    const invite = inviteDoc.data() as InviteCode;

    // Verifica se está ativo
    if (!invite.isActive) {
      return { valid: false, message: 'Código desativado' };
    }

    // Verifica se expirou
    if (Date.now() > invite.expiresAt) {
      return { valid: false, message: 'Código expirado' };
    }

    // Verifica se atingiu limite de usos
    if (invite.usedCount >= invite.maxUses) {
      return { valid: false, message: 'Código já foi utilizado' };
    }

    return { valid: true, message: 'Código válido', invite };
  } catch (error) {
    console.error('Erro ao validar código:', error);
    return { valid: false, message: 'Erro ao validar código' };
  }
};

// Marca código como usado
export const markInviteAsUsed = async (code: string, userEmail: string): Promise<boolean> => {
  try {
    const q = query(collection(db, 'invites'), where('code', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return false;

    const inviteDoc = snapshot.docs[0];
    const invite = inviteDoc.data() as InviteCode;

    // Atualiza o documento
    await updateDoc(doc(db, 'invites', inviteDoc.id), {
      usedCount: invite.usedCount + 1,
      usedBy: [...invite.usedBy, userEmail]
    });

    return true;
  } catch (error) {
    console.error('Erro ao marcar código como usado:', error);
    return false;
  }
};

// Lista todos os convites (para admin)
export const listInvites = async (): Promise<InviteCode[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'invites'));
    return snapshot.docs.map(doc => doc.data() as InviteCode);
  } catch (error) {
    console.error('Erro ao listar convites:', error);
    return [];
  }
};
