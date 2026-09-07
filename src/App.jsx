import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useLayoutEffect } from 'react'
import { CartProvider } from './context/CartContext'
import { OrdersProvider } from './context/OrdersContext'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { WishlistProvider } from './context/WishlistContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import StoreLayout from './components/layout/StoreLayout'
import LoginPage from './modules/auth/pages/LoginPage'
import RegisterPage from './modules/auth/pages/RegisterPage'
import VerifyPage from './modules/auth/pages/VerifyPage'
import ResetPasswordPage from './modules/auth/pages/ResetPasswordPage'
import HomePage from './modules/home/pages/HomePage'
import CatalogPage from './modules/catalog/pages/CatalogPage'
import ProductDetailPage from './modules/product/pages/ProductDetailPage'
import CartPage from './modules/cart/pages/CartPage'
import MisComprasPage from './modules/orders/pages/MisComprasPage'
import PedidoResultadoPage from './modules/orders/pages/PedidoResultadoPage'
import ConfiguracionPage from './modules/profile/pages/ConfiguracionPage'
import NotificationsPage from './modules/notifications/pages/NotificationsPage'
import FavoritesPage from './modules/favorites/pages/FavoritesPage'
import SearchPage from './modules/search/pages/SearchPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
      <WishlistProvider>
      <CartProvider>
        <OrdersProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Auth — fuera del layout principal */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/verificar" element={<VerifyPage />} />
            <Route path="/restablecer" element={<ResetPasswordPage />} />

            <Route path="/" element={<StoreLayout />}>
              <Route index element={<HomePage />} />
              <Route path="catalogo" element={<CatalogPage />} />
              <Route path="producto/:id" element={<ProductDetailPage />} />
              <Route path="busqueda" element={<SearchPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="carrito" element={<CartPage />} />
                <Route path="mis-compras" element={<MisComprasPage />} />
                <Route path="pedido/resultado" element={<PedidoResultadoPage />} />
                <Route path="configuracion" element={<ConfiguracionPage />} />
                <Route path="notificaciones" element={<NotificationsPage />} />
                <Route path="favoritos" element={<FavoritesPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        </OrdersProvider>
      </CartProvider>
      </WishlistProvider>
      </NotificationsProvider>
    </AuthProvider>
  )
}
