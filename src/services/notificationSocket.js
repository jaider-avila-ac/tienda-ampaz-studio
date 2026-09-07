import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { tokenStore } from './tokenStore'

const WS_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/ws`

let client = null

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Canal lateral: puramente informativo. Si no hay token, si el WS no conecta, o si el backend
// está caído, la tienda sigue funcionando normal — solo no llegan notificaciones en vivo
// (la lista igual se carga por REST al montar el componente).
export function connectNotifications({ onNotification } = {}) {
  const token = tokenStore.getToken()
  const claims = token ? decodeJwt(token) : null
  if (!token || !claims?.tnd_id || !claims?.usr_id) return null

  client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe(`/topic/cliente/${claims.tnd_id}/${claims.usr_id}`, (message) => {
        try {
          onNotification?.(JSON.parse(message.body))
        } catch {
          // mensaje mal formado — se ignora, no afecta el resto de la app
        }
      })
    },
  })

  client.activate()
  return client
}

export function disconnectNotifications() {
  client?.deactivate()
  client = null
}
