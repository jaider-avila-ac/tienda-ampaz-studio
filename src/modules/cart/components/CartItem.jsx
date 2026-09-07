import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, AlertCircle } from 'lucide-react'
import { fmt } from '../../../utils/format'

export default function CartItem({ item, onUpdateQty, onRemove }) {
  return (
    <div className={`flex gap-4 bg-white border p-4 transition-opacity ${
      item.isOutOfStock
        ? 'border-red-100 opacity-60'
        : item.isOverStock
        ? 'border-amber-200'
        : 'border-gray-100'
    }`}>

      {/* Imagen */}
      <div className="relative flex-shrink-0">
        <Link to={`/producto/${item.productId}`}>
          <img
            src={item.imagen}
            alt={item.nombre}
            className={`w-20 h-20 object-cover bg-gray-50 ${item.isOutOfStock ? 'grayscale' : ''}`}
          />
        </Link>
        {item.isOutOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 ">
            <span className="text-white text-[10px] font-black bg-red-600 px-1.5 py-0.5 ">Agotado</span>
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/producto/${item.productId}`}
          className={`text-sm font-bold hover:underline line-clamp-2 leading-tight ${
            item.isOutOfStock ? 'text-gray-400' : 'text-black'
          }`}
        >
          {item.nombre}
        </Link>

        <div className="flex flex-wrap gap-1.5 mt-1">
          {Object.entries(item.variantes ?? {}).map(([k, v]) => (
            <span key={k} className="text-xs bg-gray-100 px-2 py-0.5 text-gray-500">
              {k}: {v}
            </span>
          ))}
        </div>

        <p className={`text-base font-black mt-1 ${item.isOutOfStock ? 'text-gray-400' : 'text-black'}`}>
          {fmt(item.precio)}
        </p>

        {item.isOverStock && (
          <p className="text-xs text-amber-600 font-semibold flex items-center gap-1 mt-1">
            <AlertCircle size={11} />
            Solo hay {item.stockActual} {item.stockActual === 1 ? 'unidad disponible' : 'unidades disponibles'}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className={`flex items-center border overflow-hidden ${
            item.isOutOfStock ? 'border-gray-100 opacity-40 pointer-events-none' : 'border-gray-200'
          }`}>
            <button
              onClick={() => onUpdateQty(item.key, item.cantidad - 1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-500"
            >
              <Minus size={13} />
            </button>
            <span className="w-8 text-center text-sm font-bold">{item.cantidad}</span>
            <button
              onClick={() => onUpdateQty(item.key, item.cantidad + 1)}
              disabled={item.cantidad >= item.stockActual}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-500 disabled:opacity-30"
            >
              <Plus size={13} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-black ${item.isOutOfStock ? 'text-gray-400' : 'text-black'}`}>
              {fmt(item.subtotal)}
            </span>
            <button
              onClick={() => onRemove(item.key)}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
