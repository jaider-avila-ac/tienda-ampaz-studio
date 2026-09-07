import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getActiveCategories } from '../../../services/categoryService'

export default function CategoryGrid() {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    getActiveCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  if (categories.length === 0) return null

  return (
    <section className="container-main py-12 md:py-16">
      <div className="flex items-end justify-between mb-6 md:mb-8">
        <h2 className="section-title">Categorías</h2>
        <Link to="/catalogo" className="text-sm font-semibold text-gray-500 hover:text-black transition-colors underline underline-offset-2">
          Ver todo
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:pb-0">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/catalogo?categoria=${cat.id}`}
            className="group flex-shrink-0 w-28 md:w-auto"
          >
            {/* Caja cuadrada: siempre fondo negro, imagen encima, overlay negro, texto blanco */}
            <div className="relative overflow-hidden aspect-square mb-2 md:mb-3 bg-black">
              {/* Imagen del producto/categoría (si existe) */}
              {cat.imagenUrl && (
                <img
                  src={cat.imagenUrl}
                  alt={cat.nombre}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {/* Overlay negro siempre — hace que se vea oscuro sin importar la imagen */}
              <div className="absolute inset-0 bg-black/65 group-hover:bg-black/55 transition-colors duration-300" />
              {/* Nombre siempre en blanco */}
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-black text-center px-2 leading-tight z-10">
                {cat.nombre}
              </span>
            </div>
            <p className="text-center text-xs md:text-sm font-bold text-black group-hover:text-gray-600 transition-colors">
              {cat.nombre}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
