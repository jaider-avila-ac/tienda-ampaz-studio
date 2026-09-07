import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Check, Eye, EyeOff, LogOut, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import FormField from '../../../components/ui/FormField'
import FormInput from '../../../components/ui/FormInput'
import FormSelect from '../../../components/ui/FormSelect'
import {
  EMPTY_PROFILE,
  addDireccion,
  changePassword,
  deleteDireccion,
  getProfile,
  saveProfile,
  updateDireccion,
} from '../../../services/profileService'
import { DEPARTAMENTOS, municipiosDe } from '../../../data/colombiaGeo'
import { useAuth } from '../../../context/AuthContext'

const TIPOS_DOC = ['CC', 'CE', 'TI', 'NIT', 'Pasaporte']

const ADDR_EMPTY = {
  direccion: '',
  complemento: '',
  departamento: '',
  municipio: '',
  barrio: '',
  apartamento: '',
  contactoNombre: '',
  contactoTelefono: '',
}

function SectionCard({ title, children }) {
  return (
    <section className="bg-white border border-gray-100 p-5 sm:p-6">
      <h2 className="text-sm font-black text-black uppercase tracking-widest mb-5">{title}</h2>
      {children}
    </section>
  )
}

function SaveButton({ saved, saving }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all active:scale-95 ${
        saved ? 'bg-accent-dark text-white' : 'bg-black text-white hover:bg-gray-800'
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {saving ? 'Guardando...' : saved ? <><Check size={15} /> Guardado</> : 'Guardar cambios'}
    </button>
  )
}

function PersonalSection({ profile, onProfileSaved }) {
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(profile)
  }, [profile])

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return setError('El nombre es obligatorio')
    if (!form.apellido.trim()) return setError('El apellido es obligatorio')
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) return setError('Correo no válido')
    if (form.telefono && !/^\+?[\d\s\-()]{7,15}$/.test(form.telefono)) return setError('Teléfono no válido')
    if (form.numeroDocumento && !/^[\d\-A-Za-z]{4,20}$/.test(form.numeroDocumento.trim())) {
      return setError('Número de documento no válido')
    }

    setSaving(true)
    setError('')
    try {
      const updated = await saveProfile(form)
      onProfileSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message || 'No se pudo guardar la información')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard title="Información personal">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nombre">
            <FormInput value={form.nombre} onChange={set('nombre')} placeholder="Tu nombre" />
          </FormField>
          <FormField label="Apellido">
            <FormInput value={form.apellido} onChange={set('apellido')} placeholder="Tu apellido" />
          </FormField>
          <FormField label="Correo electrónico">
            <FormInput value={form.email} readOnly type="email" placeholder="correo@ejemplo.com" />
          </FormField>
          <FormField label="Teléfono / Celular">
            <FormInput value={form.telefono} onChange={set('telefono')} placeholder="+57 300 000 0000" />
          </FormField>
          <FormField label="Tipo de documento">
            <FormSelect value={form.tipoDocumento} onChange={set('tipoDocumento')}>
              {TIPOS_DOC.map((tipo) => <option key={tipo}>{tipo}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Número de documento">
            <FormInput value={form.numeroDocumento} onChange={set('numeroDocumento')} placeholder="1234567890" />
          </FormField>
        </div>
        {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex justify-end pt-1"><SaveButton saved={saved} saving={saving} /></div>
      </form>
    </SectionCard>
  )
}

function DireccionForm({ inicial = ADDR_EMPTY, onSave, onCancel }) {
  const [form, setForm] = useState(inicial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  // Al cambiar el departamento, el municipio elegido deja de ser válido (pertenece
  // al departamento anterior), así que se limpia para forzar a elegir uno nuevo.
  const setDepartamento = (e) => setForm((prev) => ({ ...prev, departamento: e.target.value, municipio: '' }))

  const municipios = municipiosDe(form.departamento)
  // Si la dirección ya tenía guardado un municipio que no está en la lista (dato
  // viejo escrito a mano antes de este cambio), se conserva como opción extra en
  // vez de perderlo silenciosamente al editar.
  const municipioOptions = form.municipio && !municipios.includes(form.municipio)
    ? [form.municipio, ...municipios]
    : municipios

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.direccion.trim()) return setError('La dirección es obligatoria')
    if (!form.departamento) return setError('Selecciona un departamento')
    if (!form.municipio.trim()) return setError('Selecciona un municipio')
    if (!form.barrio.trim()) return setError('El barrio es obligatorio')
    if (!form.contactoNombre.trim()) return setError('El nombre de contacto es obligatorio')
    if (!form.contactoTelefono.trim()) return setError('El teléfono de contacto es obligatorio')

    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message || 'No se pudo guardar la dirección')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <FormField label="Dirección o lugar de entrega">
        <FormInput value={form.direccion} onChange={set('direccion')} placeholder="Ej: Carrera 71d #1-14 Sur" />
      </FormField>
      <FormField label="Complemento (opcional)">
        <FormInput value={form.complemento} onChange={set('complemento')} placeholder="Sin complemento" />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Departamento">
          <FormSelect value={form.departamento} onChange={setDepartamento}>
            <option value="">Selecciona un departamento</option>
            {DEPARTAMENTOS.map((dep) => <option key={dep}>{dep}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Municipio / Localidad">
          <FormSelect value={form.municipio} onChange={set('municipio')} disabled={!form.departamento}>
            <option value="">{form.departamento ? 'Selecciona un municipio' : 'Primero elige un departamento'}</option>
            {municipioOptions.map((mun) => <option key={mun}>{mun}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Barrio">
          <FormInput value={form.barrio} onChange={set('barrio')} placeholder="Kennedy" />
        </FormField>
        <FormField label="Apartamento / Casa (opcional)">
          <FormInput value={form.apartamento} onChange={set('apartamento')} placeholder="Ej: 201" />
        </FormField>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Datos de contacto</p>
        <p className="text-xs text-gray-400 mb-3">Te llamaremos si hay un problema con la entrega.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nombre y apellido">
            <FormInput value={form.contactoNombre} onChange={set('contactoNombre')} placeholder="Juan Pérez" />
          </FormField>
          <FormField label="Teléfono">
            <div className="flex">
              <span className="flex items-center px-3 border border-gray-200 border-r-0 bg-gray-50 text-sm text-gray-500 flex-shrink-0">
                +57
              </span>
              <FormInput
                value={form.contactoTelefono}
                onChange={set('contactoTelefono')}
                placeholder="300 1234567"
                className="border-l-0"
              />
            </div>
          </FormField>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      <div className="flex items-center gap-3 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-semibold text-gray-400 hover:text-black transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-black text-white hover:bg-gray-800 transition-colors active:scale-95 disabled:opacity-60"
        >
          <Check size={15} /> {saving ? 'Guardando...' : 'Guardar dirección'}
        </button>
      </div>
    </form>
  )
}

function DireccionesSection({ direcciones, onDireccionesSaved }) {
  const [modo, setModo] = useState(null)
  const [error, setError] = useState('')

  const handleAdd = async (data) => {
    setError('')
    onDireccionesSaved(await addDireccion(data))
    setModo(null)
  }

  const handleEdit = async (id, data) => {
    setError('')
    onDireccionesSaved(await updateDireccion(id, data))
    setModo(null)
  }

  const handleDelete = async (id) => {
    setError('')
    try {
      onDireccionesSaved(await deleteDireccion(id))
      if (modo?.id === id) setModo(null)
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la dirección')
    }
  }

  return (
    <SectionCard title="Direcciones de envío">
      {direcciones.length > 0 && (
        <div className="space-y-3 mb-4">
          {direcciones.map((direccion) => {
            if (modo?.id === direccion.id) {
              return (
                <div key={direccion.id} className="border border-gray-200 p-4">
                  <p className="text-xs font-black text-black uppercase tracking-widest mb-3">Editar dirección</p>
                  <DireccionForm
                    inicial={direccion}
                    onSave={(data) => handleEdit(direccion.id, data)}
                    onCancel={() => setModo(null)}
                  />
                </div>
              )
            }
            return (
              <div key={direccion.id} className="flex items-start gap-3 p-4 border border-gray-100 bg-gray-50">
                <MapPin size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-black leading-snug">
                    {direccion.direccion}{direccion.apartamento ? `, Apto ${direccion.apartamento}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[direccion.barrio, direccion.municipio, direccion.departamento].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {direccion.contactoNombre} · +57 {direccion.contactoTelefono}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setModo({ id: direccion.id })}
                    className="p-1.5 text-gray-400 hover:text-black hover:bg-white transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(direccion.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-500 flex items-center gap-1 mb-3"><AlertCircle size={12} />{error}</p>}

      {direcciones.length === 0 && modo !== 'agregar' && (
        <p className="text-sm text-gray-400 mb-4">Aún no tienes direcciones guardadas.</p>
      )}

      {modo === 'agregar' && (
        <div className="border border-gray-200 p-4 mb-4">
          <p className="text-xs font-black text-black uppercase tracking-widest mb-3">Nueva dirección</p>
          <DireccionForm onSave={handleAdd} onCancel={() => setModo(null)} />
        </div>
      )}

      {modo !== 'agregar' && (
        <button
          type="button"
          onClick={() => setModo('agregar')}
          className="flex items-center gap-2 text-sm font-bold text-black hover:underline"
        >
          <Plus size={15} /> Agregar dirección
        </button>
      )}
    </SectionCard>
  )
}

function PreferenciasSection({ profile, onProfileSaved }) {
  const [aceptaPromo, setAceptaPromo] = useState(profile.aceptaPromo)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setAceptaPromo(profile.aceptaPromo)
  }, [profile.aceptaPromo])

  const handleToggle = async (e) => {
    const nuevoValor = e.target.checked
    setAceptaPromo(nuevoValor)
    setSaving(true)
    setError('')
    try {
      const updated = await saveProfile({ ...profile, aceptaPromo: nuevoValor })
      onProfileSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setAceptaPromo(profile.aceptaPromo) // revertir si falló
      setError(err.message || 'No se pudo guardar tu preferencia')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard title="Preferencias de comunicación">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={aceptaPromo}
          onChange={handleToggle}
          disabled={saving}
          className="mt-0.5 w-4 h-4 flex-shrink-0 accent-black"
        />
        <span className="text-sm text-gray-600 leading-relaxed">
          Quiero recibir ofertas y promociones de Ampaz Studio. Esto no afecta las notificaciones
          sobre tus pedidos (confirmación, envío, entrega), que siempre las recibes.
        </span>
      </label>
      {saved && <p className="text-xs text-accent-dark mt-2 flex items-center gap-1"><Check size={12} /> Preferencia guardada</p>}
      {error && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
    </SectionCard>
  )
}

function ContrasenaSection() {
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [show, setShow] = useState({ actual: false, nueva: false, confirmar: false })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const toggle = (key) => () => setShow((prev) => ({ ...prev, [key]: !prev[key] }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.actual) return setError('Ingresa tu contraseña actual')
    if (form.nueva.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres')
    if (form.nueva !== form.confirmar) return setError('Las contraseñas no coinciden')

    setSaving(true)
    try {
      await changePassword({ actual: form.actual, nueva: form.nueva })
      setForm({ actual: '', nueva: '', confirmar: '' })
      setSaved(true)
    } catch (err) {
      if (err.status === 409) setError('Tu cuenta usa Google — no tiene contraseña que cambiar')
      else if (err.status === 400) setError(err.message || 'Contraseña actual incorrecta')
      else setError('No se pudo cambiar la contraseña. Intenta de nuevo')
      setSaved(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard title="Seguridad">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: 'actual', label: 'Contraseña actual' },
            { key: 'nueva', label: 'Nueva contraseña' },
            { key: 'confirmar', label: 'Confirmar contraseña' },
          ].map(({ key, label }) => (
            <FormField key={key} label={label}>
              <div className="relative">
                <FormInput
                  type={show[key] ? 'text' : 'password'}
                  value={form[key]}
                  onChange={set(key)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={toggle(key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                >
                  {show[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </FormField>
          ))}
        </div>
        <p className="text-[11px] text-gray-400">
          Mínimo 8 caracteres. Usa letras, números y símbolos para mayor seguridad.
        </p>
        {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex justify-end pt-1"><SaveButton saved={saved} saving={saving} /></div>
      </form>
    </SectionCard>
  )
}

function CerrarSesionSection() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <SectionCard title="Sesión">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold border border-gray-200 text-black hover:border-black transition-colors active:scale-95 disabled:opacity-60"
      >
        <LogOut size={15} /> {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>
    </SectionCard>
  )
}

export default function ConfiguracionPage() {
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    getProfile()
      .then((data) => {
        if (alive) setProfile(data)
      })
      .catch((err) => {
        if (alive) setError(err.message || 'No se pudo cargar la información del usuario')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => { alive = false }
  }, [])

  const handleDireccionesSaved = (direcciones) => {
    setProfile((prev) => ({ ...prev, direcciones }))
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 pb-16">
      <h1 className="text-2xl font-black text-black mb-6">Configuración</h1>
      <div className="max-w-2xl space-y-4">
        {loading && (
          <div className="bg-white border border-gray-100 p-5 text-sm text-gray-500">
            Cargando información...
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-100 p-5 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {!loading && !error && (
          <>
            <PersonalSection profile={profile} onProfileSaved={setProfile} />
            <DireccionesSection
              direcciones={profile.direcciones}
              onDireccionesSaved={handleDireccionesSaved}
            />
            <PreferenciasSection profile={profile} onProfileSaved={setProfile} />
            <ContrasenaSection />
            <CerrarSesionSection />
          </>
        )}
      </div>
    </div>
  )
}
