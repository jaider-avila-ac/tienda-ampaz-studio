import { inputBase } from './FormInput'

export default function FormSelect({ className = '', children, ...props }) {
  return (
    <select className={`${inputBase}${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </select>
  )
}
