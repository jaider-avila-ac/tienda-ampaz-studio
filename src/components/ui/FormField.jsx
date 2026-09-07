export default function FormField({ label, dark = false, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={`text-xs font-semibold uppercase tracking-wider ${
        dark ? 'text-gray-300' : 'text-gray-500'
      }`}>
        {label}
      </label>
      {children}
    </div>
  )
}
