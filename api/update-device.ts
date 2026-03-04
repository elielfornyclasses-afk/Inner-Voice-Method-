import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { userId, deviceId, action } = req.body;
  if (!userId || !deviceId) return res.status(400).json({ error: 'Parâmetros inválidos' });

  // Busca metadata atual do usuário
  const getRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  const userData = await getRes.json();
  const currentMeta = userData.public_metadata || {};
  const savedDeviceId = currentMeta.deviceId;

  // check: só verifica, não registra
  if (action === 'check' && savedDeviceId && savedDeviceId !== deviceId) {
    return res.status(200).json({ allowed: false });
  }

  // claim ou primeiro acesso: registra o deviceId
  const patchRes = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_metadata: { ...currentMeta, deviceId },
    }),
  });

  if (!patchRes.ok) return res.status(500).json({ error: 'Erro ao atualizar dispositivo' });
  return res.status(200).json({ allowed: true });
}
