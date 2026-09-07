export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button className={`btn-${variant}${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </button>
  )
}
