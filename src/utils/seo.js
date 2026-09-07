const SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL

export function siteOrigin() {
  const fallback = typeof window !== 'undefined' ? window.location.origin : ''
  return String(SITE_URL || fallback).replace(/\/$/, '')
}

export function absoluteUrl(value) {
  if (!value) return ''
  try {
    return new URL(value, `${siteOrigin()}/`).href
  } catch {
    return String(value)
  }
}

export function setMetaTag(name, content, attr = 'name') {
  if (!content || typeof document === 'undefined') return
  let tag = document.head.querySelector(`meta[${attr}="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

export function setCanonical(url) {
  if (!url || typeof document === 'undefined') return
  let tag = document.head.querySelector('link[rel="canonical"]')
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', 'canonical')
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', url)
}

export function upsertJsonLd(id, data) {
  if (!data || typeof document === 'undefined') return
  let script = document.getElementById(id)
  if (!script) {
    script = document.createElement('script')
    script.id = id
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(data)
}

export function removeJsonLd(id) {
  if (typeof document === 'undefined') return
  document.getElementById(id)?.remove()
}
