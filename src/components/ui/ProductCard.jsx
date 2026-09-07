import { Link, useNavigate } from 'react-router-dom'
import { Star, Heart } from 'lucide-react'
import { fmt } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { useWishlist } from '../../context/WishlistContext'
import { useInViewOnce } from '../../hooks/useInViewOnce'

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
      className={`group block bg-white overflow-hidden hover:shadow-md transition-[box-shadow,opacity,transform] duration-500 ease-out ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Imagen */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <img
          src={imagenes?.[0]?.url ?? imagenes?.[0] ?? 'https://placehold.co/300x300/f5f5f5/999?text=Ampaz+Studio'}
          alt={nombre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {descuento > 0 && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 ">
            -{descuento}%
          </span>
        )}

        {isNew && !descuento && (
          <span className="absolute top-2 left-2 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 ">
            NUEVO
          </span>
        )}

        <button
          onClick={handleFavorito}
          aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Heart size={13} className={favorito ? 'text-accent fill-accent' : 'text-gray-400'} />
        </button>

        {!hasStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 border border-gray-200">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{marca}</p>

        <h3 className="text-xs font-medium text-gray-800 mt-0.5 line-clamp-2 leading-snug min-h-[33px] group-hover:text-black transition-colors">
          {nombre}
        </h3>

        <div className="flex items-center gap-1 mt-1.5 min-h-[11px]">
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
            <div className="flex items-baseline gap-1.5 flex-wrap">
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
