import { fetchAuth } from './api'

export const wishlistService = {
  listIds: () => fetchAuth('/lista-deseos'),
  listDetalle: () => fetchAuth('/lista-deseos/detalle'),
  add: (prdId) => fetchAuth(`/lista-deseos/${prdId}`, { method: 'POST' }),
  remove: (prdId) => fetchAuth(`/lista-deseos/${prdId}`, { method: 'DELETE' }),
}
