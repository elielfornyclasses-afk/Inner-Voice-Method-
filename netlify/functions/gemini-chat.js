const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Só aceita POST
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { prompt, history = [] } = JSON.parse(event.body);
    
    // Pega credenciais da Service Account
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    
    // Gera token de autenticação
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/generative-language']
    });
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    // Chama a API Gemini
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.token}`
        },
        body: JSON.stringify({
          contents: [
            ...history,
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Erro:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Erro ao processar requisição'
      })
    };
  }
};
```

---

## 💾 **Comita esse arquivo:**

1. Scroll até o final da página
2. Em **"Commit new file"**:
```
   Commit message: Adiciona Netlify Function para Gemini API
