'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, AlertCircle, CheckCircle, User, Monitor, Smile, Volume2, Lightbulb, Link as LinkIcon, Unplug, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Loading states
  const [isPairing, setIsPairing] = useState(false)
  const [isUnpairing, setIsUnpairing] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [deviceIdInput, setDeviceIdInput] = useState('')
  const [currentDeviceId, setCurrentDeviceId] = useState(null)

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

    // Find device associated with current user
    const { data: deviceData } = await supabase
      .from('device_configs')
      .select('device_id, settings')
      .eq('user_id', user.id)
      .limit(1) 
      .single()

    if (deviceData) {
      setCurrentDeviceId(deviceData.device_id)
      
      if (deviceData.settings) {
        const s = deviceData.settings
        setConfig({
          neck_threshold: s.neck_threshold || 35,
          alert_language: s.alert_language || 'vi',
          oled_icon_style: s.oled_icon_style || 'A',
          led_color_good: s.led_color_good ? rgbToHex(...s.led_color_good) : '#00FF00',
          led_color_bad: s.led_color_bad ? rgbToHex(...s.led_color_bad) : '#FF0000',
        })
      }
    }
    setLoading(false)
  }

  // --- PAIR DEVICE ---
  const handlePair = async () => {
    if (!deviceIdInput.trim()) {
        setMessage({ type: 'error', text: 'Please enter a valid Device ID.' })
        return
    }

    setIsPairing(true)
    setMessage({ type: '', text: '' })

    try {
        const { data: { user } } = await supabase.auth.getUser();
        const inputId = deviceIdInput.trim();

        // 1. Check ownership
        const { data: existingDevice, error: fetchError } = await supabase
            .from('device_configs')
            .select('user_id')
            .eq('device_id', inputId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { 
             console.error("Check ownership error:", fetchError);
             throw new Error("System error while checking device.");
        }

        if (existingDevice && existingDevice.user_id && existingDevice.user_id !== user.id) {
            setIsPairing(false);
            setMessage({ type: 'error', text: 'Access Denied: This device belongs to another account.' });
            return;
        }

        // 2. Perform Pairing
        const { error } = await supabase
        .from('device_configs')
        .upsert({
            device_id: inputId, 
            user_id: user.id,
            updated_at: new Date().toISOString()
        }, { onConflict: 'device_id' })

        if (error) throw error;

        // 3. Send OTA command
        await supabase.from('device_commands').insert({
            device_id: inputId,
            command: 'UPDATE_CONFIG',
            status: 'PENDING'
        });

        setCurrentDeviceId(inputId)
        setDeviceIdInput('')
        setMessage({ type: 'success', text: `Successfully paired with ${inputId}` })
        loadData();

    } catch (err) {
        console.error("Pairing Error:", err);
        // User-friendly error message
        setMessage({ type: 'error', text: 'Connection failed. Please check the Device ID and try again.' })
    } finally {
        setIsPairing(false)
    }
  }

  // --- UNPAIR DEVICE ---
  const handleUnpair = async () => {
    if (!confirm("Are you sure you want to disconnect this device?")) return;

    setIsUnpairing(true);
    try {
        const { error } = await supabase
            .from('device_configs')
            .update({ user_id: null })
            .eq('device_id', currentDeviceId);

        if (error) throw error;

        await supabase.from('device_commands').insert({
            device_id: currentDeviceId,
            command: 'UPDATE_CONFIG',
            status: 'PENDING'
        });

        setCurrentDeviceId(null);
        setMessage({ type: 'success', text: t.disconect_device });
    } catch (err) {
        console.error("Unpair Error:", err);
        setMessage({ type: 'error', text: 'Failed to disconnect device.' })
    } finally {
        setIsUnpairing(false);
    }
  }

  // --- SAVE CONFIGURATION ---
  const handleSaveConfig = async () => {
    if (!currentDeviceId) {
        setMessage({ type: 'error', text: 'No device connected.' })
        return
    }

    setIsSavingConfig(true)
    setMessage({ type: '', text: '' })

    try {
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
            alert_messages_vi: ["Bạn đang cúi đầu quá thấp, hãy giữ đâu thẳng với cột sống", "Đừng gù lưng nhé", "Đừng nghiêng đầu, ngồi thẳng lại nào", "Ngồi xa ra", "Tư thế xấu"],
            alert_messages_en: ["Sit straight", "Don't slouch", "Don't tilt head", "Sit away", "Bad posture"]
        }

        const { error } = await supabase
        .from('device_configs')
        .update({
            settings: newSettings,
            updated_at: new Date().toISOString()
        })
        .eq('device_id', currentDeviceId)

        if (error) throw error;

        await supabase.from('device_commands').insert({
            device_id: currentDeviceId,
            command: 'UPDATE_CONFIG',
            status: 'PENDING'
        });

        setMessage({ type: 'success', text: 'Configuration updated successfully!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)

    } catch (err) {
        console.error("Config Error:", err);
        setMessage({ type: 'error', text: 'Failed to update configuration.' })
    } finally {
        setIsSavingConfig(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
       <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8 pb-10">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900">{t.settings}</h1>
        <p className="text-gray-600 mt-1">{t.setting_desc}</p>
      </div>

      {message.text && (
        <div className={`flex items-center gap-3 p-4 rounded-lg animate-fade-in ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* --- DEVICE PAIRING SECTION --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-blue-50/30">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-800">
                <LinkIcon className="w-5 h-5" />
                <h2 className="text-lg font-bold">{t.connect_device}</h2>
                </div>
                {/* Connection Status */}
                {currentDeviceId ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> {t.connect}
                    </span>
                ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold border border-gray-200">
                        {t.disconnect}
                    </span>
                )}
            </div>
          </div>
          
          <div className="p-6">
              {!currentDeviceId ? (
                  /* UNPAIRED VIEW */
                  <div className="flex gap-3">
                      <input 
                          type="text" 
                          value={deviceIdInput}
                          onChange={(e) => setDeviceIdInput(e.target.value)}
                          placeholder={t.enter_device}
                          className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
                      />
                      <button 
                        onClick={handlePair}
                        disabled={isPairing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 min-w-[100px]"
                      >
                        {isPairing ? '...' : t.connect}
                      </button>
                  </div>
              ) : (
                  /* PAIRED VIEW */
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div>
                          <p className="text-sm text-gray-500">Kêt nối tới:</p>
                          <p className="text-lg font-bold text-gray-800">{currentDeviceId}</p>
                      </div>
                      <button 
                        onClick={handleUnpair}
                        disabled={isUnpairing}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                      >
                        <Unplug className="w-4 h-4" />
                        {isUnpairing ? t.disconnecting : t.disconnect}
                      </button>
                  </div>
              )}
          </div>
      </div>

      {/* --- BOT CONFIGURATION SECTION --- */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-opacity ${!currentDeviceId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-blue-700">
            <Monitor className="w-5 h-5" />
            <h2 className="text-lg font-bold">{t.bot_config}</h2>
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
            onClick={handleSaveConfig}
            disabled={isSavingConfig || !currentDeviceId}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSavingConfig ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isSavingConfig ? 'Updating...' : 'Update Configuration'}
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
            <label className="block text-xs text-gray-500 mb-1">Tham gia</label>
            <p className="text-gray-900 font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}