import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/ui/Sidebar'
import Navbar from '@/components/ui/Navbar'

export const metadata = {
  title: 'Posture Monitor Dashboard',
  description: 'Real-time posture monitoring system',
}

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar user={user} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar user={user} />
        
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}