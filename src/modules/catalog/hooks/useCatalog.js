import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts, getProductsPage } from '../../../services/productService'
import { getProductosDeColeccion } from '../../../services/coleccionService'

const PAGE_SIZE = 24

export function useCatalog() {
  const [params, setParams] = useSearchParams()

  const coleccionId   = params.get('coleccion')   ? Number(params.get('coleccion')) : null
  const categoriaId   = params.get('categoria')   ? Number(params.get('categoria')) : null
  const subcategoria  = params.get('subcategoria') ?? ''
  const genero        = params.get('genero')       ?? ''
  const etiqueta      = params.get('etiqueta')     ?? ''
  const soloDescuento = params.get('descuento') === 'true'
  const sort          = params.get('sort')         ?? 'relevancia'
  const hasRefinements = Boolean(subcategoria || genero || etiqueta || soloDescuento)

  // ── "Todo el catálogo": lista completa, cacheada y con refresco en segundo plano ──
  const [allProducts, setAllProducts] = useState([])
  const [allLoading, setAllLoading] = useState(true)

  useEffect(() => {
    if (categoriaId || coleccionId) return
    let alive = true
    getProducts()
      .then((data) => { if (alive) setAllProducts(Array.isArray(data) ? data : []) })
      .catch(() => { if (alive) setAllProducts([]) })
      .finally(() => { if (alive) setAllLoading(false) })
    return () => { alive = false }
  }, [categoriaId, coleccionId])

  // ── Colección: lista curada de productos, un solo fetch (no pagina) ──
  const [coleccionProducts, setColeccionProducts] = useState([])
  const [coleccionLoading, setColeccionLoading] = useState(true)

  useEffect(() => {
    if (!coleccionId) return
    let alive = true
    setColeccionLoading(true)
    getProductosDeColeccion(coleccionId)
      .then((data) => { if (alive) setColeccionProducts(Array.isArray(data) ? data : []) })
      .catch(() => { if (alive) setColeccionProducts([]) })
      .finally(() => { if (alive) setColeccionLoading(false) })
    return () => { alive = false }
  }, [coleccionId])

  // ── Dentro de una categoría: scroll infinito paginado contra el backend,
  // en vez de traer todo el catálogo de una sola vez ──
  const [pageItems, setPageItems]   = useState([])
  const [pageNum, setPageNum]       = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [pageLoading, setPageLoading]   = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const activeCatRef = useRef(null)

  useEffect(() => {
    if (!categoriaId) return
    activeCatRef.current = categoriaId
    setPageItems([])
    setPageNum(0)
    setTotalPages(0)
    setPageLoading(true)
    getProductsPage({ catId: categoriaId, page: 0, size: PAGE_SIZE })
      .then((res) => {
        if (activeCatRef.current !== categoriaId) return
        setPageItems(res.content)
        setPageNum(res.page)
        setTotalPages(res.totalPages)
      })
      .catch(() => {})
      .finally(() => { if (activeCatRef.current === categoriaId) setPageLoading(false) })
  }, [categoriaId])

  const loadMore = useCallback(() => {
    if (!categoriaId || loadingMore || pageLoading || pageNum + 1 >= totalPages) return
    setLoadingMore(true)
    const next = pageNum + 1
    getProductsPage({ catId: categoriaId, page: next, size: PAGE_SIZE })
      .then((res) => {
        if (activeCatRef.current !== categoriaId) return
        setPageItems((prev) => [...prev, ...res.content])
        setPageNum(res.page)
        setTotalPages(res.totalPages)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [categoriaId, pageNum, totalPages, loadingMore, pageLoading])

  const items   = coleccionId ? coleccionProducts : (categoriaId ? pageItems   : allProducts)
  const loading = coleccionId ? coleccionLoading  : (categoriaId ? pageLoading : allLoading)
  const hasMore = Boolean(categoriaId) && !coleccionId && pageNum + 1 < totalPages

  const categoryProducts = useMemo(() => items.filter((p) => p.activo), [items])

  const filtered = useMemo(() => {
    let list = items.filter((p) => p.activo)

    if (subcategoria)  list = list.filter((p) => p.subcategoria === subcategoria)
    if (genero)        list = list.filter((p) => p.genero === genero)
    if (etiqueta)      list = list.filter((p) => p.etiquetas.includes(etiqueta))
    if (soloDescuento) list = list.filter((p) => p.descuento > 0)

    if (sort === 'precio-asc')        list = [...list].sort((a, b) => a.precio - b.precio)
    else if (sort === 'precio-desc')  list = [...list].sort((a, b) => b.precio - a.precio)
    else if (sort === 'nombre')       list = [...list].sort((a, b) => a.nombre.localeCompare(b.nombre))
    else if (sort === 'descuento')    list = [...list].sort((a, b) => b.descuento - a.descuento)

    return list
  }, [items, subcategoria, genero, etiqueta, soloDescuento, sort])

  // Si hay un sub-filtro activo y las páginas ya cargadas no alcanzan a mostrar
  // suficientes resultados, seguimos pidiendo páginas hasta encontrar más o agotar el catálogo —
  // los sub-filtros se aplican sobre lo cargado, no vuelven a pedirle al backend.
  useEffect(() => {
    if (categoriaId && hasRefinements && filtered.length < 8 && hasMore && !loadingMore && !pageLoading) {
      loadMore()
    }
  }, [categoriaId, hasRefinements, filtered.length, hasMore, loadingMore, pageLoading, loadMore])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value || value === '') next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  const clearFilters = ({ preserveCategory = false } = {}) => {
    if (preserveCategory && categoriaId) setParams({ categoria: String(categoriaId) })
    else setParams({})
  }

  return {
    filtered,
    categoryProducts,
    loading,
    hasMore,
    loadingMore,
    loadMore,
    params,
    setFilter,
    clearFilters,
    sort,
    categoriaId,
    coleccionId,
    subcategoria,
    genero,
    etiqueta,
    soloDescuento,
  }
}
