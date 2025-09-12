'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

interface NavItemProps {
  href: string
  name: string
  icon: string
  isCollapsed?: boolean
}

export function NavItem({ href, name, icon, isCollapsed = false }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={clsx(
        'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
        isActive
          ? 'bg-brand-800 text-white'
          : 'text-brand-100 hover:bg-brand-600 hover:text-white'
      )}
    >
      <span className="text-lg mr-3">{icon}</span>
      {!isCollapsed && <span>{name}</span>}
    </Link>
  )
}
