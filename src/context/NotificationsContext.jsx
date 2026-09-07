import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { notificationService } from '../services/notificationService'
import { connectNotifications, disconnectNotifications } from '../services/notificationSocket'
import { playNotificationSound } from '../utils/notificationSound'

const NotificationsCtx = createContext(null)

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState([])

  const load = useCallback(() => {
    if (!isAuthenticated) {
      setItems([])
      return
    }
    notificationService.list().then((data) => setItems(data ?? [])).catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    load()
    if (!isAuthenticated) return undefined

    connectNotifications({
      onNotification: (n) => setItems((prev) => [n, ...prev]),
    })
    return () => disconnectNotifications()
  }, [isAuthenticated, load])

  const markRead = useCallback((id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)))
    notificationService.markRead(id).catch(() => {})
  }, [])

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, leida: true })))
    notificationService.markAllRead().catch(() => {})
  }, [])

  const deleteNotification = useCallback((id) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
    notificationService.remove(id).catch(() => {})
  }, [])

  const unreadCount = items.filter((n) => !n.leida).length

  return (
    <NotificationsCtx.Provider value={{ items, unreadCount, markRead, markAllRead, deleteNotification }}>
      {children}
    </NotificationsCtx.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsCtx)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
