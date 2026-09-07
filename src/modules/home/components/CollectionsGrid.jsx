import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getColecciones } from '../../../services/coleccionService'

export default function CollectionsGrid() {
  const [colecciones, setColecciones] = useState([])

  useEffect(() => {
    getColecciones().then(setColecciones).catch(() => {})
  }, [])

  if (colecciones.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 pt-10">
      <div className="mb-4">
        <h2 className="text-base font-black text-black">Colecciones destacadas</h2>
      </div>
      <div className={`grid gap-3 ${colecciones.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {colecciones.map((col) => (
          <Link
            key={col.id}
            to={`/catalogo?coleccion=${col.id}`}
            className="relative overflow-hidden bg-black aspect-[16/7] flex items-center p-6 group"
          >
            {col.imagenUrl && (
              <img
                src={col.imagenUrl}
                alt={col.nombre}
                className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-300"
              />
            )}
            <div className="relative z-10">
              <h3 className="text-white text-2xl font-black leading-tight">{col.nombre}</h3>
              {col.descripcion && (
                <p className="text-gray-300 text-xs mt-1 line-clamp-2">{col.descripcion}</p>
              )}
              <span className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-white bg-white/20 px-3 py-1.5 group-hover:bg-white/30 transition-colors">
                Ver colección <ArrowRight size={11} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
