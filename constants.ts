
import { DayOfWeek, DailyMethod, AccessCode } from './types';

export const DEFAULT_LESSON_CONTENT = `The importance of the Inner Voice Method lies in the connection between listening and speaking. When you listen carefully, your brain starts to organize the sounds before you even try to produce them. 

This process creates a clear cognitive map of the language, making it easier to speak naturally and without the constant need for translation. Focus on the rhythm, the pauses, and the melody of the words.`;

/**
 * LISTA MESTRA DE ACESSOS (NETLIFY)
 * Para dar acesso a um novo aluno:
 * 1. Adicione o código desejado na lista abaixo (entre aspas e separado por vírgula).
 * 2. Salve e faça o deploy/push no GitHub/Netlify.
 * Esses códigos funcionam para todos os usuários e não expiram.
 */
export const PERMANENT_KEYS = [
  'INNER-TEST-24H',
  'ALUNO-VIP-2025',
  'METODO-INNER-VOICE',
  'CURSO-INGLES-2025'
];

// Gera automaticamente os objetos de acesso baseados na lista acima
export const AUTHORIZED_CODES: AccessCode[] = PERMANENT_KEYS.map(key => ({
  key,
  expiry: Date.now() + (1000 * 60 * 60 * 24 * 365 * 10), // 10 anos de validade
  createdAt: Date.now(),
  description: 'Chave Mestra (Arquivo)',
  isActive: true
}));

export const PEDAGOGICAL_PRINCIPLES = [
  { title: "Clareza precede prática", description: "Entender o que trava é o primeiro passo para destravar." },
  { title: "Escuta organiza a fala", description: "O som que você não ouve, você não consegue produzir." },
  { title: "Repetição consciente supera variedade", description: "Um único texto bem explorado vale mais que mil frases soltas." },
  { title: "Integração entre encontros", description: "O avanço real acontece na prática autônoma diária." }
];

export const METHODOLOGY: DailyMethod[] = [
  {
    day: DayOfWeek.MONDAY,
    title: "Escuta & Imersão",
    steps: [
      "Escuta integral do texto",
      "Leitura silenciosa com som interno",
      "Repetição leve de frases curtas"
    ],
    instruction: "Você é um Mentor Inner Voice (Orientador Perceptivo). Hoje é Segunda-feira: Escuta & Imersão. Seu objetivo é ajudar o aluno a alinhar sua 'escuta refinada'. Leia o texto de forma clara, focando na melodia. Peça ao aluno para apenas ouvir e depois repetir blocos muito curtos, focando no 'som interno' das palavras, sem pressão por acerto."
  },
  {
    day: DayOfWeek.TUESDAY,
    title: "Ritmo & Fluência",
    steps: [
      "Escuta focada em ritmo e pausas",
      "Repetição encadeada",
      "Leitura em voz alta sem autocorreção"
    ],
    instruction: "Você é um Mentor Inner Voice (Leitor de Padrões). Hoje é Terça-feira: Ritmo & Fluência. O foco é o fluxo. Identifique bloqueios rítmicos. Peça ao aluno para ler sem parar para se corrigir. Se ele travar, peça para repetir o bloco rítmico (pausas e conexões), não apenas a palavra isolada."
  },
  {
    day: DayOfWeek.WEDNESDAY,
    title: "Vogais & Som",
    steps: [
      "Escuta seletiva das vogais tônicas",
      "Repetição lenta priorizando vogais",
      "Leitura de frases isoladas"
    ],
    instruction: "Você é um Mentor Inner Voice (Orientador Perceptivo). Hoje é Quarta-feira: Vogais & Som. O foco é a percepção sonora das vogais. Ajude o aluno a 'sentir' o som das vogais tônicas. Peça repetições lentas, quase exageradas, para que ele perceba a diferença entre a voz interna e a produção oral."
  },
  {
    day: DayOfWeek.THURSDAY,
    title: "Fluência Contínua",
    steps: [
      "Leitura contínua do texto",
      "Ajuste de um trecho específico",
      "Repetição de memória"
    ],
    instruction: "Você é um Mentor Inner Voice (Ajustador de Rota). Hoje é Quinta-feira: Fluência Contínua. Peça uma leitura integral. Escolha apenas 1 ou 2 ajustes centrais (intervenção pontual). Depois, peça para o aluno repetir um pequeno trecho de memória para verificar se a 'voz interna' está alinhada."
  },
  {
    day: DayOfWeek.FRIDAY,
    title: "Integração & Fala Livre",
    steps: [
      "Escuta relaxada",
      "Leitura mental",
      "Expressão livre sobre o tema (1-2 min)"
    ],
    instruction: "Você é um Mentor Inner Voice. Hoje é Sexta-feira: Integração & Fala Livre. O foco é autonomia e clareza cognitiva. Não corrija erros gramaticais agora. Peça ao aluno para falar livremente sobre o texto ou sua rotina por 2 minutos. Incentive o uso do vocabulário do texto, mas foque na fluidez e na segurança."
  }
];
