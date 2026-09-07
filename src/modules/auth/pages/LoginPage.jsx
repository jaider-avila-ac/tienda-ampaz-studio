import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { authService } from '../../../services/authService'
import { useAuth } from '../../../context/AuthContext'
import { isInAppBrowser, isAndroid } from '../../../utils/googleButton'
import GoogleAuthDiagnostics from '../components/GoogleAuthDiagnostics'
import { googleAuthEnvironment, recordGoogleAuthEvent } from '../../../utils/googleAuthDiagnostics'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function TermsText() {
  return (
    <p className="text-center text-xs text-gray-400 leading-relaxed">
      Al continuar aceptas los{' '}
      <a href="https://www.ampazstudio.com/terminos" target="_blank" rel="noopener noreferrer" className="font-bold text-black hover:underline">Términos de uso</a>
      {' '}y la{' '}
      <a href="https://www.ampazstudio.com/privacidad" target="_blank" rel="noopener noreferrer" className="font-bold text-black hover:underline">Política de privacidad</a>.
    </p>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? '/'
  const { login } = useAuth()

  const [view, setView] = useState('social')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleBtnRef = useRef(null)
  const googleWatchdogRef = useRef(null)
  const [googleDiagnosticVisible, setGoogleDiagnosticVisible] = useState(false)
  const [inAppBrowser] = useState(isInAppBrowser)

  const success = useCallback((data) => {
    login(data)
    navigate(from, { replace: true })
  }, [login, navigate, from])

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authService.login(email, password)
      success(data)
    } catch (err) {
      if (err.status === 409 && err.data?.message === 'USE_GOOGLE') {
        setError('Esta cuenta usa Google. Inicia sesión con Google.')
      } else {
        setError('Correo o contraseña incorrectos')
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
      success(data)
    } catch (err) {
      if (err.status === 409 && err.data?.message === 'USE_PASSWORD') {
        setError('Esta cuenta usa contraseña. Usa el formulario de correo.')
      } else {
        setError('No se pudo iniciar sesión con Google. Intenta de nuevo.')
      }
      setGoogleDiagnosticVisible(true)
      setGoogleLoading(false)
    }
  }, [success])

  const handleGoogleClick = useCallback(() => {
    recordGoogleAuthEvent('google_button_clicked', googleAuthEnvironment('login'))
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
  // comunicación entre ventanas. El click_listener y el watchdog permiten distinguir si
  // Google no devuelve la credencial o si el bloqueo ocurre después, al llamar al backend.
  useEffect(() => {
    recordGoogleAuthEvent('auth_page_loaded', googleAuthEnvironment('login'))
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
      {/* Panel lateral — PLACEHOLDER en degradado de marca hasta tener una foto real (ver
          public/img/, vacía a propósito: no se inventó una foto de la tienda). */}
      <div className="flex-1 hidden md:flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7B5F30 0%, #B69A6A 100%)' }}>
        <img src="/logos/imagotico-ampaz-studio.svg" alt="Ampaz Studio" className="h-16" />
      </div>

      {/* Formulario */}
      <div className="w-full md:w-[470px] bg-white flex items-center justify-center overflow-y-auto px-10 py-12 border-l border-gray-100">
        <div className="w-full max-w-[380px] flex flex-col gap-6">

          {/* Logo */}
          <Link to="/" className="flex justify-center">
            <img src="/logos/imagotico-ampaz-studio.svg" alt="Ampaz Studio" className="h-14" style={{ filter: 'invert(1)' }} />
          </Link>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700 text-center">
              {error}
            </div>
          )}

          <GoogleAuthDiagnostics forceVisible={googleDiagnosticVisible} />

          {/* Panel: social */}
          {view === 'social' && (
            <>
              <h2 className="text-center text-2xl font-bold text-black">Iniciar sesión</h2>
              <div className="space-y-3">
                {inAppBrowser ? (
                  <p className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800 text-center leading-relaxed">
                    Google no permite iniciar sesión desde el navegador integrado de esta app.
                    Toca el menú (⋯) y elige <strong>"Abrir en Chrome"</strong> o <strong>"Abrir en el navegador"</strong>,
                    o usa "Continuar con correo" abajo.
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
                <button
                  onClick={() => setView('email')}
                  className="w-full h-[54px] border border-gray-200 text-[15px] font-semibold text-black bg-white hover:border-accent hover:bg-gray-50 transition-colors flex items-center justify-center active:scale-[0.98]"
                >
                  Continuar con correo
                </button>
              </div>
              <p className="text-center text-sm text-gray-500">
                ¿No tienes cuenta?{' '}
                <Link to="/registro" className="font-bold text-black hover:underline">Regístrate</Link>
              </p>
              <TermsText />
            </>
          )}

          {/* Panel: email */}
          {view === 'email' && (
            <>
              <h2 className="text-center text-2xl font-bold text-black">Iniciar sesión</h2>
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-xs text-gray-500 hover:text-black transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'} required value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full h-[54px] bg-accent text-white text-base font-bold hover:bg-accent-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" />Ingresando…</> : 'Ingresar'}
                </button>
              </form>
              <div className="text-center space-y-2 text-sm">
                <p className="text-gray-500">
                  ¿No tienes cuenta?{' '}
                  <Link to="/registro" className="font-bold text-black hover:underline">Regístrate</Link>
                </p>
                <button onClick={() => setView('social')} className="text-xs text-gray-400 hover:text-black transition-colors">
                  ← Volver
                </button>
              </div>
              <TermsText />
            </>
          )}

          {/* Panel: forgot password */}
          {view === 'forgot' && <ForgotInline onBack={() => setView('email')} />}

        </div>
      </div>
    </div>
  )
}

function ForgotInline({ onBack }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch {
      setError('No se pudo enviar el código. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <>
        <h2 className="text-center text-2xl font-bold text-black">Código enviado</h2>
        <p className="text-center text-sm text-gray-500">
          Si el correo existe, recibirás un código en los próximos minutos.
        </p>
        <button
          onClick={() => navigate('/restablecer')}
          className="w-full h-[54px] bg-accent text-white text-base font-bold hover:bg-accent-dark transition-colors"
        >
          Ingresar código
        </button>
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-black transition-colors text-center">
          ← Volver al login
        </button>
      </>
    )
  }

  return (
    <>
      <h2 className="text-center text-2xl font-bold text-black">Olvidé mi contraseña</h2>
      <p className="text-center text-sm text-gray-500">
        Te enviaremos un código de 6 dígitos para restablecerla.
      </p>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700 text-center">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="w-full px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit" disabled={loading}
          className="w-full h-[54px] bg-accent text-white text-base font-bold hover:bg-accent-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" />Enviando…</> : 'Enviar código'}
        </button>
      </form>
      <button onClick={onBack} className="text-xs text-gray-400 hover:text-black transition-colors text-center">
        ← Volver al login
      </button>
    </>
  )
}
