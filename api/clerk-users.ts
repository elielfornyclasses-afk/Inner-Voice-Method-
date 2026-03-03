import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;
const CLERK_API = 'https://api.clerk.com/v1';

const clerkHeaders = {
  Authorization: `Bearer ${CLERK_SECRET_KEY}`,
  'Content-Type': 'application/json',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/clerk-users → lista usuários
    if (req.method === 'GET') {
      const response = await fetch(`${CLERK_API}/users?limit=100&order_by=-created_at`, {
        headers: clerkHeaders,
      });
      const users = await response.json();
      return res.status(200).json(users);
    }

    // POST /api/clerk-users → atualiza metadata (ativar/renovar/bloquear)
    if (req.method === 'POST') {
      const { userId, action, plan, days } = req.body;

      if (!userId || !action) {
        return res.status(400).json({ error: 'userId e action são obrigatórios' });
      }

      // Busca usuário atual
      const userRes = await fetch(`${CLERK_API}/users/${userId}`, {
        headers: clerkHeaders,
      });
      const userData = await userRes.json();
      const currentSub = userData.public_metadata?.subscription;

      let newMetadata: object;

      if (action === 'activate' || action === 'renew') {
        const now = Date.now();
        // Se renovar e ainda tem tempo, soma em cima do que resta
        const baseTime = action === 'renew' && currentSub?.expiresAt > now
          ? currentSub.expiresAt
          : now;
        const expiresAt = baseTime + (days * 24 * 60 * 60 * 1000);

        newMetadata = {
          subscription: {
            plan: plan || currentSub?.plan || 'premium',
            status: 'active',
            expiresAt,
            startedAt: currentSub?.startedAt || now,
          },
        };
      } else if (action === 'block') {
        newMetadata = {
          subscription: {
            ...currentSub,
            status: 'blocked',
          },
        };
      } else if (action === 'unblock') {
        newMetadata = {
          subscription: {
            ...currentSub,
            status: 'active',
          },
        };
      } else {
        return res.status(400).json({ error: 'Action inválida' });
      }

      const updateRes = await fetch(`${CLERK_API}/users/${userId}/metadata`, {
        method: 'PATCH',
        headers: clerkHeaders,
        body: JSON.stringify({ public_metadata: newMetadata }),
      });

      const updated = await updateRes.json();
      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
