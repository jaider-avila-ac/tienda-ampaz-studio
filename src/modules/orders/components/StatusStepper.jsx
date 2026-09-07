import { ShoppingBag, CheckCircle, Truck, PackageCheck } from 'lucide-react'

const ESTADOS = [
  { key: 'pagado', label: 'Recibido', Icon: ShoppingBag },
  { key: 'preparando', label: 'Preparando', Icon: CheckCircle },
  { key: 'enviado', label: 'Enviado', Icon: Truck },
  { key: 'entregado', label: 'Entregado', Icon: PackageCheck },
]

export default function StatusStepper({ estado }) {
  const currentStep = ESTADOS.findIndex((e) => e.key === estado)

  if (estado === 'cancelado') {
    return <p className="text-xs text-red-500 font-semibold">Pedido cancelado</p>
  }

  return (
    <div className="flex items-center gap-0">
      {ESTADOS.map(({ key, label, Icon }, i) => {
        const done = i < currentStep
        const active = i === currentStep
        return (
          <div key={key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 flex items-center justify-center flex-shrink-0 transition-colors ${
                done ? 'bg-black text-white' :
                active ? 'bg-black text-white ring-2 ring-black ring-offset-2' :
                          'bg-gray-100 text-gray-300'
              }`}>
                <Icon size={13} />
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${
                done || active ? 'text-black' : 'text-gray-400'
              }`}>
                {label}
              </span>
            </div>
            {i < ESTADOS.length - 1 && (
              <div className={`h-px w-8 sm:w-12 mb-4 flex-shrink-0 ${done ? 'bg-black' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
