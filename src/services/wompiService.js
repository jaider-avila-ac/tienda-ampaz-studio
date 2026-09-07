import { fetchPublic } from './api'

// Tokens legales de Wompi (términos + tratamiento de datos) que hay que mostrar
// antes de tokenizar una tarjeta, y la base URL/llave pública para tokenizar.
export function getAcceptanceTokens() {
  return fetchPublic('/pagos/acceptance-tokens')
}

// Tokeniza la tarjeta directamente contra Wompi (nunca pasa por nuestro backend,
// así los datos crudos de la tarjeta nunca tocan nuestro servidor).
export async function tokenizeCard({ number, cvc, expMonth, expYear, cardHolder }, wompiBaseUrl, publicKey) {
  const res = await fetch(`${wompiBaseUrl}/tokens/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicKey}`,
    },
    body: JSON.stringify({
      number: number.replace(/\s+/g, ''),
      cvc,
      exp_month: expMonth,
      exp_year: expYear,
      card_holder: cardHolder,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const reason = data?.error?.reason || data?.error?.messages || 'No se pudo validar la tarjeta'
    throw new Error(typeof reason === 'string' ? reason : 'No se pudo validar la tarjeta')
  }
  return data.data.id
}
