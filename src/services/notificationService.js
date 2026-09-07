import { fetchAuth } from './api'

export const notificationService = {
  list: () => fetchAuth('/notificaciones'),
  markRead: (id) => fetchAuth(`/notificaciones/${id}/leer`, { method: 'POST' }),
  markAllRead: () => fetchAuth('/notificaciones/leer-todas', { method: 'POST' }),
  remove: (id) => fetchAuth(`/notificaciones/${id}`, { method: 'DELETE' }),
}
