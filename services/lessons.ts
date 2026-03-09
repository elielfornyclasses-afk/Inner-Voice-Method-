import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export type LessonLanguage = 'english' | 'french';

export interface Lesson {
  id?: string;
  title: string;
  content: string;
  language: LessonLanguage;
  studentEmail: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  createdBy: string;
}

// Cria nova lição
export const createLesson = async (lesson: Omit<Lesson, 'id' | 'createdAt'>): Promise<Lesson> => {
  const data: Omit<Lesson, 'id'> = { ...lesson, createdAt: Date.now() };
  const ref = await addDoc(collection(db, 'lessons'), data);
  return { ...data, id: ref.id };
};

// Lista lições de um aluno por idioma
export const getLessonsForStudent = async (
  studentEmail: string,
  language: LessonLanguage
): Promise<Lesson[]> => {
  try {
    const q = query(
      collection(db, 'lessons'),
      where('studentEmail', '==', studentEmail),
      where('language', '==', language),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lesson));
  } catch (error) {
    console.error('Erro ao buscar lições:', error);
    return [];
  }
};

// Lista todas as lições (admin)
export const listAllLessons = async (): Promise<Lesson[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'lessons'));
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as Lesson))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Erro ao listar lições:', error);
    return [];
  }
};

// Deleta lição
export const deleteLesson = async (lessonId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
    return true;
  } catch (error) {
    console.error('Erro ao deletar lição:', error);
    return false;
  }
};
