'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, AlertCircle, CheckCircle, User, Trash2, Monitor, Smile, Volume2, Lightbulb } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [config, setConfig] = useState({
    neck_threshold: 35,
    alert_language: 'vi',
    oled_icon_style: 'A',
    led_color_good: '#00FF00',
    led_color_bad: '#FF0000'
  })

  const supabase = createClient()
  const { t } = useLanguage();

  useEffect(() => {
    loadData()
  }, [])

  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0]
  }

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUser(user)

    const { data } = await supabase
      .from('device_configs')
      .select('settings')
      .single()

    if (data?.settings) {
      const s = data.settings
      setConfig({
        neck_threshold: s.neck_threshold || 35,
        alert_language: s.alert_language || 'vi',
        oled_icon_style: s.oled_icon_style || 'A',
        led_color_good: s.led_color_good ? rgbToHex(...s.led_color_good) : '#00FF00',
        led_color_bad: s.led_color_bad ? rgbToHex(...s.led_color_bad) : '#FF0000',
      })
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    const newSettings = {
      neck_threshold: parseFloat(config.neck_threshold),
      nose_drop_threshold: 0.15,
      ml_confidence_threshold: 0.75,
      smoothing_frames: 6,
      status_buffer_size: 8,
      alert_language: config.alert_language,
      oled_icon_style: config.oled_icon_style,
      led_color_good: hexToRgb(config.led_color_good),
      led_color_bad: hexToRgb(config.led_color_bad),
      alert_messages_vi: ["Bạn đang cúi đầu, giữ đầu thẳng nhé", "Đừng gù lưng, hãy ngồi thẳng lên nhé", "Đừng nghiêng đầu", "Ngồi xa ra", "Tư thế chưa chuẩn"],
      alert_messages_en: ["Sit up straight", "Don't slouch", "Don't tilt head", "Sit further away", "Bad posture"]
    }

    const { error } = await supabase
      .from('device_configs')
      .upsert({
        device_id: DEVICE_ID,
        settings: newSettings,
        updated_at: new Date().toISOString()
      })

    if (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Configuration saved to Pi!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8 pb-10">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900">{t.settings}</h1>
        <p className="text-gray-600 mt-1">{t.nav_desc || 'Device Configuration & Account'}</p>
      </div>

      {message.text && (
        <div className={`flex items-center gap-3 p-4 rounded-lg animate-fade-in ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-blue-700">
            <Monitor className="w-5 h-5" />
            <h2 className="text-lg font-bold">{t.update || 'Posture Bot Configuration'}</h2>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Smile className="w-4 h-4"/> {t.oled_style}
              </label>
              <select 
                value={config.oled_icon_style}
                onChange={(e) => setConfig({...config, oled_icon_style: e.target.value})}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 "
              >
                <option value="A">{t.style_a}</option>
                <option value="B">{t.style_b}</option>
                <option value="C">{t.style_c}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Volume2 className="w-4 h-4"/> {t.voice}
              </label>
              <select 
                value={config.alert_language}
                onChange={(e) => setConfig({...config, alert_language: e.target.value})}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 "
              >
                <option value="vi">{t.vietnam}</option>
                <option value="en">{t.english}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4"/> {t.led_color}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg bg-gray-50">
                <span className="text-xs text-gray-500 block mb-2">{t.good_posture}</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={config.led_color_good}
                    onChange={(e) => setConfig({...config, led_color_good: e.target.value})}
                    className="h-9 w-16 cursor-pointer rounded border p-0.5 bg-white"
                  />
                  <code className="text-sm">{config.led_color_good}</code>
                </div>
              </div>
              <div className="p-3 border rounded-lg bg-gray-50">
                <span className="text-xs text-gray-500 block mb-2">{t.bad_posture}</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={config.led_color_bad}
                    onChange={(e) => setConfig({...config, led_color_bad: e.target.value})}
                    className="h-9 w-16 cursor-pointer rounded border p-0.5 bg-white"
                  />
                  <code className="text-sm">{config.led_color_bad}</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={loadData}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition"
          >
            {t.cancel || 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition shadow-sm flex items-center gap-2 disabled:opacity-70"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? (t.loading || 'Saving...') : (t.update || 'Save')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4 text-gray-700">
          <User className="w-5 h-5" />
          <h2 className="text-lg font-semibold">{t.settings || 'Account'}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <p className="text-gray-900 font-medium truncate">{user?.email}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <label className="block text-xs text-gray-500 mb-1">Joined</label>
            <p className="text-gray-900 font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-3 mb-4 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <h2 className="text-lg font-semibold">{t.alerts || 'Danger Zone'}</h2>
        </div>
        <p className="text-sm text-red-600 mb-4">
          {t.no_data || 'Permanently delete all posture history data. This cannot be undone.'}
        </p>
        <button
          onClick={async () => {
            if (confirm('⚠️ Are you sure you want to delete all history?')) {
              await supabase.from('posture_records').delete().eq('user_id', user.id)
              setMessage({ type: 'success', text: t.update || 'History deleted.' })
              setTimeout(() => window.location.reload(), 1500)
            }
          }}
          className="w-full sm:w-auto px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {t.update || 'Clear History'}
        </button>
      </div>
    </div>
  )
}