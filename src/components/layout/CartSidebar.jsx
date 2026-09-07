import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2, Plus, Minus, X, ArrowRight } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { fmt } from '../../utils/format'

export default function CartSidebar({ onClose }) {
  const { cart, removeFromCart, updateQty, total, shipping, shippingContraEntrega, count, freeShip } = useCart()
  const freeShipActive = freeShip.activo

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag size={17} className="text-black" />
          <span className="text-sm font-bold text-black">Tu carrito</span>
          {count > 0 && (
            <span className="w-5 h-5 bg-black text-white text-xs font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-gray-100 lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Barra envío gratis (solo si el admin la tiene activa) */}
      {freeShipActive && total > 0 && !freeShip.alcanzado && (
        <div className="px-3 py-2 bg-red-50 border-b border-red-100 flex-shrink-0">
          <p className="text-xs text-black font-medium">
            Te faltan <strong>{fmt(freeShip.faltante)}</strong> para envío gratis
          </p>
          <div className="mt-1.5 h-1.5 bg-red-100 overflow-hidden">
            <div
              className="h-full bg-accent-dark transition-all"
              style={{ width: `${freeShip.progreso}%` }}
            />
          </div>
        </div>
      )}
      {freeShip.alcanzado && (
        <div className="px-3 py-2 bg-accent border-b border-accent-dark flex-shrink-0 text-center">
          <p className="text-xs font-bold text-black">🎉 ¡Envío gratis desbloqueado!</p>
        </div>
      )}

      {/* Vacío */}
      {cart.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-12 h-12 bg-gray-100 flex items-center justify-center mb-3">
            <ShoppingBag size={20} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Carrito vacío</p>
          <p className="text-xs text-gray-400 mt-1">Agrega productos para verlos aquí</p>
        </div>
      )}

      {/* Items */}
      {cart.length > 0 && (
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          {cart.map((item) => (
            <div key={item.key} className="flex gap-2.5">
              {/* Imagen */}
              <Link to={`/producto/${item.productId}`} onClick={onClose} className="flex-shrink-0">
                <img
                  src={item.imagen}
                  alt={item.nombre}
                  className="w-14 h-14 object-cover bg-gray-100"
                />
              </Link>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-black leading-tight line-clamp-2">{item.nombre}</p>
                <div className="flex gap-1 mt-0.5">
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 text-gray-500">{item.talla}</span>
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 text-gray-500">{item.color}</span>
                </div>
                <p className="text-xs font-black text-black mt-1">{fmt(item.precio)}</p>
                {/* Qty + eliminar */}
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex items-center border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => updateQty(item.key, item.cantidad - 1)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 text-gray-500"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">{item.cantidad}</span>
                    <button
                      onClick={() => updateQty(item.key, item.cantidad + 1)}
                      disabled={item.cantidad >= item.stockDisponible}
                      className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.key)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                  <span className="ml-auto text-xs font-bold text-black">{fmt(item.subtotal)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer con total + botón */}
      {cart.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-gray-500">Subtotal</span>
            <span className="text-base font-black text-black">{fmt(total)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-gray-500">Envío</span>
            <span className={`text-xs font-semibold ${shipping === 0 ? 'text-accent' : 'text-gray-700'}`}>
              {shippingContraEntrega ? 'Contra entrega' : shipping === 0 ? 'Gratis' : fmt(shipping)}
            </span>
          </div>
          <Link
            to="/carrito"
            onClick={onClose}
            className="btn-primary w-full py-2.5 text-sm"
          >
            Ir a comprar <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </div>
  )
}
