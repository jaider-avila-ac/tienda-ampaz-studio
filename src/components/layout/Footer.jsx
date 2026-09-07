import { Instagram, Facebook, MapPin, Phone } from 'lucide-react'

// lucide-react no trae el logo real de WhatsApp (su MessageCircle es una burbuja genérica,
// sin la silueta del teléfono) — mismo SVG que ya usa el footer del sitio-web.
function IconWhatsApp({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function IconTikTok({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0115.54 3h-3.09v12.4a2.592 2.592 0 01-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 004.3 1.38V7.3s-1.88.09-3.24-1.48z"/>
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="bg-white text-black border-t border-gray-100 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <img src="/logos/imagotico-ampaz-studio.svg" alt="Ampaz Studio" className="h-8" style={{ filter: 'invert(1)' }} />
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {/* PLACEHOLDER: describe acá a qué se dedica Ampaz Studio. */}
              Ampaz Studio.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {/* PLACEHOLDER: reemplazar los href por las redes/WhatsApp reales de Ampaz Studio. */}
              {[
                { icon: Instagram, href: 'https://www.instagram.com/', label: 'Instagram' },
                { icon: Facebook, href: 'https://www.facebook.com/', label: 'Facebook' },
                { icon: IconTikTok, href: 'https://www.tiktok.com/', label: 'TikTok' },
                { icon: IconWhatsApp, href: 'https://wa.me/573000000000', label: 'WhatsApp' },
              ].map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-accent transition-all" aria-label={label}>
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {/* Info — PLACEHOLDER: estas páginas no existen todavía, apuntan al dominio real de
              Ampaz Studio a futuro (mismo patrón que calzacaribe.com/terminos etc.) */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-black mb-4">Información</h3>
            <ul className="space-y-2">
              {[
                { label: 'Política de cambios', href: 'https://www.ampazstudio.com/cambios' },
                { label: 'Guía de tallas', href: 'https://www.ampazstudio.com/tallas' },
                { label: 'Términos y condiciones', href: 'https://www.ampazstudio.com/terminos' },
                { label: 'Política de privacidad', href: 'https://www.ampazstudio.com/privacidad' },
                { label: 'Preguntas frecuentes', href: 'https://www.ampazstudio.com/faq' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-accent transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto — PLACEHOLDER: reemplazar teléfono/dirección por los reales de Ampaz Studio. */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-black mb-4">Contacto</h3>
            <div className="space-y-4">
              <div>
                <a href="https://wa.me/573000000000" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors">
                  <Phone size={14} className="text-gray-500 flex-shrink-0" />300 000 0000
                </a>
                <p className="flex items-start gap-2 text-sm text-gray-600 mt-1.5">
                  <MapPin size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>Dirección pendiente</span>
                </p>
              </div>
            </div>
            <div className="mt-5 p-3 bg-aux">
              <p className="text-xs text-gray-500">Horario de atención</p>
              <p className="text-sm font-semibold text-black mt-0.5">Lun–Sáb 8am–6pm</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">© 2026 Ampaz Studio. Todos los derechos reservados.</p>
          <p className="text-xs text-gray-500">
            Desarrollado por{' '}
            <a href="https://brandingcol.com/" target="_blank" rel="noopener noreferrer"
              className="hover:text-accent transition-colors">
              BrandingCol | Jaider Avila
            </a>
          </p>
          <div className="flex items-center gap-3">
            {['Nequi', 'PSE', 'Visa', 'Mastercard'].map((p) => (
              <span key={p} className="text-xs px-2 py-1 text-gray-500 font-medium">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
