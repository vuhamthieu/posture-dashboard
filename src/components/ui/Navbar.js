'use client'
import { Bell, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher'; 

export default function Navbar({ user }) {
  const router = useRouter()
  const supabase = createClient()
  
  const { t } = useLanguage();

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t.welcome_back}
          </h2>
          <p className="text-sm text-gray-500">
            {t.nav_desc}
          </p>
        </div>

        <div className="flex items-center gap-4">
          
          <LanguageSwitcher />

          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">{t.logout}</span>
          </button>
        </div>
      </div>
    </header>
  )
}