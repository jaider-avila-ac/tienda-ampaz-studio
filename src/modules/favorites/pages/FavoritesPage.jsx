import { useEffect, useState } from 'react'
import { HeartOff, Loader2 } from 'lucide-react'
import { wishlistService } from '../../../services/wishlistService'
import ProductCard from '../../../components/ui/ProductCard'

export default function FavoritesPage() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    wishlistService.listDetalle()
      .then((data) => setProductos(data ?? []))
      .catch(() => setProductos([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-black">Favoritos</h1>
        <p className="text-xs text-gray-400 mt-0.5">Los productos que has guardado</p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[50vh] text-gray-400 text-sm">
          <Loader2 size={28} className="animate-spin" />
          Cargando…
        </div>
      )}

      {!loading && productos.length === 0 && (
        <div className="bg-white border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <HeartOff size={28} className="text-gray-300" />
          </div>
          <p className="text-base font-black text-black mb-1">Sin favoritos todavía</p>
          <p className="text-sm text-gray-400">
            Toca el corazón en cualquier producto para guardarlo aquí.
          </p>
        </div>
      )}

      {!loading && productos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {productos.map((p) => (
            <ProductCard key={p.id} product={{
              id: p.id,
              nombre: p.nombre,
              marca: p.marca,
              imagenes: p.imagenes,
              precio: p.precio,
              precioFinal: p.precio_final,
              descuento: p.descuento,
              etiquetas: p.etiquetas,
              tallas: p.tallas,
            }} />
          ))}
        </div>
      )}
    </div>
  )
}
