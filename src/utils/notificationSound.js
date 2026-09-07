// Sonido de notificación — archivo real en public/sounds/notification.wav.
let audio = null

export function playNotificationSound() {
  try {
    audio ??= new Audio('/sounds/notification.wav')
    audio.currentTime = 0
    audio.volume = 0.5
    audio.play().catch(() => {
      // Autoplay bloqueado hasta la primera interacción del usuario — no es crítico.
    })
  } catch {
    // Navegador sin soporte de Audio — se ignora, no es crítico.
  }
}
