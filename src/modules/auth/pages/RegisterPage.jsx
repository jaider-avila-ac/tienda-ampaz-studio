import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { authService } from '../../../services/authService'
import { useAuth } from '../../../context/AuthContext'
import { isInAppBrowser, isAndroid } from '../../../utils/googleButton'
import GoogleAuthDiagnostics from '../components/GoogleAuthDiagnostics'
import { googleAuthEnvironment, recordGoogleAuthEvent } from '../../../utils/googleAuthDiagnostics'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function capitalizeWords(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-CO')
    .replace(/(^|\s)(\S)/g, (_, space, letter) => `${space}${letter.toLocaleUpperCase('es-CO')}`)
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaPromo, setAceptaPromo] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleBtnRef = useRef(null)
  const googleWatchdogRef = useRef(null)
  const [googleDiagnosticVisible, setGoogleDiagnosticVisible] = useState(false)
  const [inAppBrowser] = useState(isInAppBrowser)

  const normalizedEmail = email.trim()
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  const canSubmit =
    nombre.trim().length > 0 &&
    isEmailValid &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword &&
    aceptaTerminos

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!aceptaTerminos) {
      setError('Debes aceptar los Términos de uso y la Política de privacidad para continuar.')
      return
    }
    if (!canSubmit) return
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.')
      return
    }
    setLoading(true)
    try {
      await authService.register(
        normalizedEmail,
        password,
        capitalizeWords(nombre),
        capitalizeWords(apellido),
        numeroDocumento.trim(),
        aceptaTerminos,
        aceptaPromo,
      )
      navigate('/verificar', { state: { email: normalizedEmail } })
    } catch (err) {
      if (err.status === 409) {
        if (err.data?.message === 'CODE_PENDING') {
          navigate('/verificar', { state: { email: normalizedEmail } })
        } else {
          setError('Este correo ya está registrado.')
        }
      } else {
        setError('No se pudo crear la cuenta. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = useCallback(async (response) => {
    clearTimeout(googleWatchdogRef.current)
    recordGoogleAuthEvent('credential_callback_received', {
      credential_present: Boolean(response?.credential),
      select_by: response?.select_by || null,
    })
    setGoogleLoading(true)
    setError('')
    try {
      const data = await authService.googleLogin(response.credential)
      recordGoogleAuthEvent('session_received_navigating')
      login(data)
      navigate('/', { replace: true })
    } catch (err) {
      if (err.status === 409 && err.data?.message === 'USE_PASSWORD') {
        setError('Esta cuenta usa contraseña. Ve a iniciar sesión.')
      } else {
        setError('No se pudo continuar con Google. Intenta de nuevo.')
      }
      setGoogleDiagnosticVisible(true)
      setGoogleLoading(false)
    }
  }, [login, navigate])

  const handleGoogleClick = useCallback(() => {
    recordGoogleAuthEvent('google_button_clicked', googleAuthEnvironment('register'))
    setGoogleLoading(true)
    clearTimeout(googleWatchdogRef.current)
    googleWatchdogRef.current = setTimeout(() => {
      recordGoogleAuthEvent('credential_callback_timeout', {
        waited_ms: 45000,
        visibility: document.visibilityState,
        focused: document.hasFocus(),
        online: navigator.onLine,
      })
      setGoogleLoading(false)
      setGoogleDiagnosticVisible(true)
      setError('Google no devolvió la confirmación después de 45 segundos. Cierra la pantalla en blanco, vuelve aquí y copia el diagnóstico.')
    }, 45000)
  }, [])

  // El botón oficial evita overlays incompatibles, pero el popup todavía depende de la
  // comunicación entre ventanas. El click_listener y el watchdog permiten ubicar el bloqueo.
  useEffect(() => {
    recordGoogleAuthEvent('auth_page_loaded', googleAuthEnvironment('register'))
    if (inAppBrowser) {
      recordGoogleAuthEvent('in_app_browser_blocked')
      return
    }
    let cancelled = false
    let retryTimeoutId
    let renderFn

    const setup = () => {
      if (cancelled) return
      if (!window.google || !googleBtnRef.current) {
        retryTimeoutId = setTimeout(setup, 200)
        return
      }
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
          ux_mode: 'popup',
          // Chrome Android usa el mediador nativo y no depende del canal popup/opener
          // ni de cookies de terceros para devolver la credencial. Solo Android: en desktop
          // este modo rompía el login (ver fix de este mismo bug).
          use_fedcm_for_button: isAndroid(),
        })
        recordGoogleAuthEvent('gis_initialized', {
          client_id_present: Boolean(GOOGLE_CLIENT_ID),
          ux_mode: 'popup',
          use_fedcm_for_button: isAndroid(),
        })
      } catch (error) {
        recordGoogleAuthEvent('gis_initialize_error', { name: error.name, message: error.message })
        setGoogleDiagnosticVisible(true)
        setError('No se pudo inicializar el acceso con Google.')
        return
      }
      renderFn = () => {
        if (!googleBtnRef.current) return
        googleBtnRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          logo_alignment: 'left',
          width: googleBtnRef.current.offsetWidth,
          click_listener: handleGoogleClick,
        })
        recordGoogleAuthEvent('google_button_rendered', { width: googleBtnRef.current.offsetWidth })
      }
      renderFn()
      window.addEventListener('resize', renderFn)
    }
    setup()

    return () => {
      cancelled = true
      clearTimeout(retryTimeoutId)
      clearTimeout(googleWatchdogRef.current)
      if (renderFn) window.removeEventListener('resize', renderFn)
    }
  }, [handleGoogleCredential, handleGoogleClick, inAppBrowser])

  return (
    <div className="flex w-full h-screen overflow-hidden bg-white">
      {/* Panel lateral — PLACEHOLDER en degradado de marca, ver LoginPage.jsx */}
      <div className="flex-1 hidden md:flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7B5F30 0%, #B69A6A 100%)' }}>
        <img src="/logos/imagotico-ampaz-studio.svg" alt="Ampaz Studio" className="h-16" />
      </div>

      {/* Formulario */}
      <div className="w-full md:w-[470px] bg-white flex items-center justify-center overflow-y-auto px-10 py-12 border-l border-gray-100">
        <div className="w-full max-w-[380px] flex flex-col gap-5">

          {/* Logo */}
          <div className="flex justify-center mb-2">
            <img src="/logos/imagotico-ampaz-studio.svg" alt="Ampaz Studio" className="h-14" style={{ filter: 'invert(1)' }} />
          </div>

          <h2 className="text-center text-2xl font-bold text-black">Crear cuenta</h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700 text-center">
              {error}
            </div>
          )}

          <GoogleAuthDiagnostics forceVisible={googleDiagnosticVisible} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nombre</label>
                <input
                  type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder="Juan"
                  className="w-full px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Apellido</label>
                <input
                  type="text" value={apellido} onChange={(e) => setApellido(e.target.value)}
                  placeholder="Pérez"
                  className="w-full px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                Número de cédula <span className="normal-case font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                type="text" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)}
                placeholder="Si compraste antes en tienda física, úsala para ver tu historial"
                className="w-full px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Correo electrónico</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                />
                <button
                  type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Repetir contrasena</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Escribe la contrasena otra vez"
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                />
                <button
                  type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 text-xs text-gray-500 leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 accent-black"
                />
                <span>
                  He leído y acepto los{' '}
                  <a href="https://www.ampazstudio.com/terminos" target="_blank" rel="noopener noreferrer" className="font-bold text-black hover:underline">Términos de uso</a>
                  {' '}y la{' '}
                  <a href="https://www.ampazstudio.com/privacidad" target="_blank" rel="noopener noreferrer" className="font-bold text-black hover:underline">Política de privacidad</a>.
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-xs text-gray-500 leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceptaPromo}
                  onChange={(e) => setAceptaPromo(e.target.checked)}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 accent-black"
                />
                <span>Quiero recibir ofertas y promociones de Ampaz Studio (puedes cambiarlo cuando quieras).</span>
              </label>
            </div>

            <button
              type="submit" disabled={loading || !canSubmit}
              className="w-full h-[54px] bg-black text-white text-base font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" />Registrando…</> : 'Crear cuenta'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {inAppBrowser ? (
            <p className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800 text-center leading-relaxed">
              Google no permite registrarse desde el navegador integrado de esta app.
              Toca el menú (⋯) y elige <strong>"Abrir en Chrome"</strong> o <strong>"Abrir en el navegador"</strong>,
              o crea tu cuenta con correo arriba.
            </p>
          ) : (
            <div className="relative w-full min-h-[54px] flex items-center justify-center [&>div]:!w-full [&_iframe]:!w-full">
              <div ref={googleBtnRef} className="w-full" />
              {googleLoading && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center gap-2 text-sm font-semibold text-black">
                  <Loader2 size={18} className="animate-spin" /> Continuando…
                </div>
              )}
            </div>
          )}

          <p className="text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-bold text-black hover:underline">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
