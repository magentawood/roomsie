import Link from 'next/link'
import type { ComponentType, ReactNode, SVGProps } from 'react'

export type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
type Variant = 'primary' | 'secondary' | 'tertiary' | 'link-error' | 'destructive'
type Size = 'xs' | 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-solid text-primary_on-brand shadow-xs-skeuomorphic hover:bg-brand-solid_hover',
  // Figma draws the stroke inside the box, so the line is an inset ring that adds no height.
  secondary: 'bg-primary text-secondary shadow-xs inset-ring inset-ring-(color:--border-color-primary) hover:bg-primary_hover hover:text-secondary_hover',
  tertiary: 'text-tertiary hover:bg-primary_hover hover:text-tertiary_hover',
  'link-error': 'text-error-primary hover:underline',
  destructive: 'bg-error-solid text-primary_on-brand shadow-xs-skeuomorphic hover:bg-error-solid_hover',
}
const sizes: Record<Size, string> = {
  xs: 'gap-1 rounded-md px-2.5 py-1.5 text-sm',
  sm: 'gap-1 rounded-md px-3 py-2 text-sm',
  md: 'gap-1 rounded-md px-3.5 py-2.5 text-sm',
  lg: 'gap-1.5 rounded-md px-4 py-2.5 text-md',
}
const iconOnlySizes: Record<Size, string> = { xs: 'rounded-md p-1.5', sm: 'rounded-md p-2', md: 'rounded-md p-2.5', lg: 'rounded-md p-3' }

export type ButtonProps = {
  children?: ReactNode
  variant?: Variant
  size?: Size
  iconLeading?: Icon
  iconTrailing?: Icon
  /** For a button with only an icon. It is the accessible name. */
  label?: string
  href?: string
  /** For a toggle button, as Save and Saved. */
  pressed?: boolean
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
}

export function Button({ children, variant = 'secondary', size = 'sm', iconLeading: Leading, iconTrailing: Trailing, label, href, pressed, disabled, onClick, type = 'button', className = '' }: ButtonProps) {
  const shape = variant === 'link-error' ? 'gap-1 text-sm' : children ? sizes[size] : iconOnlySizes[size]
  const classes = `inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${shape} ${className}`
  // The designs give the label of a button 2 px of padding (not a text link), and an xs button 16 px icons.
  const iconSize = size === 'xs' && children ? 16 : 20
  const text = variant === 'link-error' ? children : children && <span className="px-0.5">{children}</span>
  const content = (
    <>
      {Leading && <Leading size={iconSize} aria-hidden className="shrink-0" />}
      {text}
      {Trailing && <Trailing size={iconSize} aria-hidden className="shrink-0" />}
    </>
  )
  if (href && !disabled) return <Link href={href} aria-label={label} className={classes}>{content}</Link>
  return <button type={type} aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick} className={classes}>{content}</button>
}
