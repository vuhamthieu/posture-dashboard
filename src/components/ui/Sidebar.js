'use client'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assets/logowithtext.png'
import { usePathname } from 'next/navigation'
import { useLanguage } from "@/context/LanguageContext";
import { 
  Home, 
  History, 
  BarChart3, 
  Settings,
  Camera,
  Download,
  Pi
} from 'lucide-react'



export default function Sidebar({ user }) {
  const pathname = usePathname()
  const { t } = useLanguage();

  const navItems = [
    { href: "/", label: t.dashboard, icon: Home}, 
    { href: "/history", label: t.history, icon: History },   
    { href: "/analytics", label: t.analytics, icon: BarChart3 },
    { href: "/settings", label: t.settings, icon: Settings },
    { href: "/update", label: t.update, icon: Download },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-center">
          {/* Hiển thị logo với text */}
          <Image 
            src={logo} 
            alt="PosturePal Logo" 
            width={150} 
            height={40}
            className="rounded-lg"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {user?.email?.[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email}
            </p>
            <p className="text-xs text-gray-500">Free Plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}