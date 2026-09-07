export const inputBase =
  'w-full border border-gray-200 px-4 py-2.5 text-sm font-medium text-black ' +
  'placeholder-gray-300 focus:outline-none focus:border-black transition-colors'

const inputBaseDark =
  'w-full h-[58px] border border-[#2f2f2f] pl-4 bg-[#1a1a1a] ' +
  'text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors text-[15px] font-medium'

export default function FormInput({ dark = false, className = '', ...props }) {
  const base = dark ? inputBaseDark : inputBase
  return <input className={`${base}${className ? ` ${className}` : ''}`} {...props} />
}
