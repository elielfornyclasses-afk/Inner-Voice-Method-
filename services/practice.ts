import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const todayKey = () => new Date().toISOString().split('T')[0];

export const registerPractice = async (email: string): Promise<void> => {
  try {
    const key = todayKey();
    const ref = doc(db, 'practiceLog', `${email}_${key}`);
    await setDoc(ref, { email, date: key, completedAt: Date.now() });
  } catch (error) {
    console.error('Erro ao registrar prática:', error);
  }
};

export const hasPracticedToday = async (email: string): Promise<boolean> => {
  try {
    const key = todayKey();
    const ref = doc(db, 'practiceLog', `${email}_${key}`);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (error) {
    console.error('Erro ao verificar prática:', error);
    return false;
  }
};
