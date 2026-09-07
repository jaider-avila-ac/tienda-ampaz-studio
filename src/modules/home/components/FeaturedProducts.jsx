import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ProductCard from '../../../components/ui/ProductCard'
import { getProducts } from '../../../services/productService'

export default function FeaturedProducts({ title = 'Más Vendidos', filter = 'mas-vendido', to = '/catalogo', limit = 4 }) {
  const [products, setProducts] = useState([])

  useEffect(() => {
    getProducts()
      .then((data) => {
        const filtered = data
          .filter((p) => p.activo && (filter === 'all' ? true : p.etiquetas.includes(filter)))
          .slice(0, limit)
        setProducts(filtered)
      })
      .catch(() => setProducts([]))
  }, [filter, limit])

  if (products.length === 0) return null

  return (
    <section className="container-main py-8 md:py-12">
      <div className="flex items-end justify-between mb-6 md:mb-8">
        <h2 className="section-title">{title}</h2>
        <Link to={to} className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-black transition-colors">
          Ver todos <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}
