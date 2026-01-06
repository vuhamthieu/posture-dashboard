'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import OTAPanel from '@/components/ui/OTAPanel'
import { useLanguage } from '@/context/LanguageContext';
import { ShieldAlert, ChevronRight, Server } from 'lucide-react'

export default function UpdatePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true)
  const [connectedDevice, setConnectedDevice] = useState(null)
  
  const supabase = createClient()

  useEffect(() => {
    checkDeviceConnection()
  }, [])

  const checkDeviceConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('device_configs')
        .select('device_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (data) {
        setConnectedDevice(data.device_id)
      }
    } catch (error) {
      console.error("Lỗi kiểm tra thiết bị:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
         <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-black mb-2">
          {t.firm_mag || 'Quản lý Firmware'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t.update_desc || 'Cập nhật phần mềm và khởi động lại thiết bị từ xa.'}
        </p>
      </div>

      {!connectedDevice ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center max-w-2xl mx-auto mt-10">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Chưa kết nối thiết bị
          </h2>
          <p className="text-gray-600 mb-6">
            Bạn cần kết nối Posture Bot với tài khoản trước khi thực hiện cập nhật.
          </p>
          <Link 
            href="/settings" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            Đi tới Cài đặt <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-100 w-fit">
            <Server className="w-4 h-4" />
            <span>Thiết bị đích: <strong>{connectedDevice}</strong></span>
          </div>

          <OTAPanel deviceId={connectedDevice} />
        </div>
      )}
    </div>
  )
}