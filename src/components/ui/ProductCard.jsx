import { Link, useNavigate } from 'react-router-dom'
import { Star, Heart } from 'lucide-react'
import { fmt } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { useWishlist } from '../../context/WishlistContext'
import { useInViewOnce } from '../../hooks/useInViewOnce'

// ══════════════════════════════════════════════════════════════════════════
// Versión alterna de la tarjeta de producto: mismos datos/props y misma
// lógica (favoritos, stock, oferta, rating), pero con otra forma — esquinas
// redondeadas, badges en píldora, botón de favorito circular con borde, y el
// precio + nombre centrados debajo de la imagen en vez del bloque alineado
// a la izquierda de antes.
// ══════════════════════════════════════════════════════════════════════════
export default function ProductCard({ product }) {
  const { id, nombre, marca, imagenes, precio, precioFinal, descuento, etiquetas, tallas, ratingPromedio, totalResenas } = product
  const finalPrice = precioFinal ?? precio
  const isNew = etiquetas?.includes('nuevo')
  const hasStock = tallas?.some((t) => t.stock > 0) ?? true
  const tieneResenas = Boolean(totalResenas > 0)

  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { isFavorito, toggle } = useWishlist()
  const favorito = isFavorito(id)
  const [inViewRef, inView] = useInViewOnce()

  const handleFavorito = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/producto/${id}` } })
      return
    }
    toggle(id)
  }

  return (
    <Link
      ref={inViewRef}
      to={`/producto/${id}`}
      className={`group block rounded-2xl bg-white border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-[box-shadow,opacity,transform] duration-500 ease-out ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Imagen */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden rounded-t-2xl">
        <img
          src={imagenes?.[0]?.url ?? imagenes?.[0] ?? 'https://placehold.co/300x300/f5f5f5/999?text=Ampaz+Studio'}
          alt={nombre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {(descuento > 0 || isNew) && (
          <span className={`absolute top-2.5 left-2.5 rounded-full text-white text-[10px] font-bold px-2.5 py-1 shadow-sm ${
            descuento > 0 ? 'bg-red-600' : 'bg-accent'
          }`}>
            {descuento > 0 ? `-${descuento}%` : 'Nuevo'}
          </span>
        )}

        <button
          onClick={handleFavorito}
          aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Heart size={13} className={favorito ? 'text-accent fill-accent' : 'text-gray-400'} />
        </button>

        {/* Precio en overlay al pasar el mouse (desktop) */}
        <div className="hidden sm:flex absolute inset-x-2.5 bottom-2.5 items-center justify-between rounded-full bg-white/95 backdrop-blur-sm px-3 py-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 shadow-sm">
          <span className="text-xs font-black text-black truncate">{fmt(finalPrice)}</span>
          {tieneResenas && (
            <span className="flex items-center gap-0.5 flex-shrink-0 ml-2">
              <Star size={10} className="text-amber-400 fill-amber-400" />
              <span className="text-[10px] text-gray-500">{ratingPromedio?.toFixed(1)}</span>
            </span>
          )}
        </div>

        {!hasStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 text-center sm:text-left">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{marca}</p>

        <h3 className="text-xs font-medium text-gray-800 mt-0.5 line-clamp-2 leading-snug min-h-[33px] group-hover:text-black transition-colors">
          {nombre}
        </h3>

        <div className="flex items-center justify-center sm:justify-start gap-1 mt-1.5 min-h-[11px]">
          {tieneResenas && (
            <>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={9}
                  className={n <= Math.round(ratingPromedio) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                />
              ))}
              <span className="text-[10px] text-gray-400 ml-0.5">({totalResenas})</span>
            </>
          )}
        </div>

        <div className="mt-2">
          {descuento > 0 ? (
            <div className="flex items-baseline justify-center sm:justify-start gap-1.5 flex-wrap">
              <p className="text-sm font-black text-accent">{fmt(finalPrice)}</p>
              <p className="text-[10px] text-gray-400 line-through">{fmt(precio)}</p>
            </div>
          ) : (
            <p className="text-sm font-black text-black">{fmt(finalPrice)}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
