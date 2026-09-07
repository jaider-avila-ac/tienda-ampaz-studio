import { Link } from 'react-router-dom'
import { Tag } from 'lucide-react'

export default function PromoBanner() {
  return (
    <section className="container-main py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Promo principal */}
        <div className="relative overflow-hidden bg-black min-h-48 flex items-center p-8">
          <img
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"
            alt="Oferta"
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
          <div className="relative z-10">
            <span className="badge-sale text-sm px-3 py-1 mb-3 inline-block">Hasta 25% off</span>
            <h3 className="text-white text-2xl font-black leading-tight">Sneakers<br />de temporada</h3>
            <p className="text-gray-400 text-sm mt-2 mb-4">Tenis y zapatillas con descuento especial</p>
            <Link to="/catalogo?subcategoria=Sneakers" className="btn-lime px-5 py-2.5 inline-flex text-sm font-bold">
              Ver oferta
            </Link>
          </div>
        </div>

        {/* Promo secundaria */}
        <div className="relative overflow-hidden bg-violet-950 min-h-48 flex items-center p-8">
          <img
            src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80"
            alt="Tacones"
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={14} className="text-accent" />
              <span className="text-accent text-xs font-bold uppercase tracking-wide">Colección mujer</span>
            </div>
            <h3 className="text-white text-2xl font-black leading-tight">Tacones &<br />Botines</h3>
            <p className="text-gray-300 text-sm mt-2 mb-4">Los estilos más elegantes de la temporada</p>
            <Link to="/catalogo?categoria=1" className="btn-primary bg-accent hover:bg-accent-dark text-white px-5 py-2.5 inline-flex text-sm font-bold">
              Descubrir
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
