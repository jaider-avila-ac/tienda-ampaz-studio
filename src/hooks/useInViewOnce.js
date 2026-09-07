import { useEffect, useRef, useState } from 'react'

// Detecta cuándo un elemento entra en el viewport y se queda en true para siempre
// (una sola animación de entrada por elemento, no se repite al hacer scroll de ida y vuelta).
export function useInViewOnce({ threshold = 0.15, rootMargin = '0px 0px -40px 0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return [ref, inView]
}
