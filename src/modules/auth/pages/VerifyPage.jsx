import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { authService } from '../../../services/authService'
import { useAuth } from '../../../context/AuthContext'

export default function VerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email ?? ''
  const { login } = useAuth()

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending,setResending]= useState(false)
  const [error, setError] = useState('')
  const [resendMsg,setResendMsg]= useState('')
  const inputs = useRef([])

  const code = digits.join('')

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (code.length < 6) { setError('Ingresa el código de 6 dígitos'); return }
    setError('')
    setLoading(true)
    try {
      const data = await authService.verify(email, code)
      login(data)
      navigate('/', { replace: true })
    } catch (err) {
      if (err.data?.message === 'CODE_INVALID') setError('Código incorrecto')
      else if (err.data?.message === 'CODE_EXPIRED') setError('El código expiró. Solicita uno nuevo.')
      else if (err.data?.message === 'PENDING_NOT_FOUND') setError('Sesión expirada. Regístrate de nuevo.')
      else setError('Error al verificar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendMsg('')
    setError('')
    setResending(true)
    try {
      await authService.resendCode(email)
      setResendMsg('Nuevo código enviado.')
    } catch (err) {
      if (err.status === 425) {
        const secs = err.data?.message?.split(':')?.[1]
        setResendMsg(`El código aún es válido. Espera ${secs ?? 'unos'} segundos.`)
      } else {
        setError('No se pudo reenviar el código.')
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-[400px] flex flex-col gap-6 text-center">

        <div className="flex justify-center">
          <img src="/logos/imagotico-ampaz-studio.svg" alt="Ampaz Studio" className="h-14" style={{ filter: 'invert(1)' }} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-black mb-2">Verifica tu correo</h2>
          <p className="text-sm text-gray-500">
            Ingresa el código de 6 dígitos enviado a<br />
            <span className="font-semibold text-black">{email || 'tu correo'}</span>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        {resendMsg && (
          <div className="p-3 bg-green-50 border border-green-200 text-sm text-green-700">
            {resendMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text" inputMode="numeric" maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-black border-2 border-gray-200 focus:outline-none focus:border-accent transition-colors"
              />
            ))}
          </div>

          <button
            type="submit" disabled={loading || code.length < 6}
            className="w-full h-[54px] bg-accent text-white text-base font-bold hover:bg-accent-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" />Verificando…</> : 'Verificar'}
          </button>
        </form>

        <button
          onClick={handleResend} disabled={resending}
          className="text-sm text-gray-500 hover:text-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {resending && <Loader2 size={13} className="animate-spin" />}
          ¿No recibiste el código? Reenviar
        </button>

        <button
          onClick={() => navigate('/registro')}
          className="text-xs text-gray-400 hover:text-black transition-colors"
        >
          ← Volver al registro
        </button>
      </div>
    </div>
  )
}
