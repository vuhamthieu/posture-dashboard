// src/app/(app)/settings/page.js
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Clock, Save, AlertCircle, CheckCircle, User, Key, 
  RefreshCw, Copy, Eye, EyeOff, Trash2, Volume2, Mic
} from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState({
    bad_posture_threshold: 5,
    voice_alert_enabled: true,
    voice_language: 'vi-VN',
    voice_volume: 80,
    alert_frequency: 'every_time' // every_time, once_per_session
  })
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
    generateApiKey()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    const { data, error } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setSettings({
        bad_posture_threshold: data.bad_posture_threshold || 5,
        voice_alert_enabled: data.notification_enabled !== false,
        voice_language: data.sound_type === 'en' ? 'en-US' : 'vi-VN',
        voice_volume: 80,
        alert_frequency: 'every_time'
      })
    }
    setLoading(false)
  }

  const generateApiKey = () => {
    // Generate API key từ user ID
    const key = `pk_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`
    setApiKey(key)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    const { error } = await supabase
      .from('alert_settings')
      .upsert({
        user_id: user.id,
        bad_posture_threshold: settings.bad_posture_threshold,
        notification_enabled: settings.voice_alert_enabled,
        sound_type: settings.voice_language === 'vi-VN' ? 'vi' : 'en',
        updated_at: new Date().toISOString()
      })

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
    setSaving(false)
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied to clipboard!' })
    setTimeout(() => setMessage({ type: '', text: '' }), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your posture monitoring system</p>
      </div>

      {/* Success/Error Message */}
      {message.text && (
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Account Info */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <p className="text-gray-900 font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Account Created</label>
            <p className="text-gray-900 font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* API Key for Raspberry Pi */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Raspberry Pi Connection</h2>
        </div>
        
        <div className="bg-white rounded-lg p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key (Use this in your Pi script)
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                readOnly
                className="w-full px-4 py-2 pr-10 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => copyToClipboard(apiKey)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button
              onClick={generateApiKey}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-blue-900 text-white rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <p className="text-blue-200 mb-2"># Run this on your Raspberry Pi:</p>
          <code className="block whitespace-pre">
{`curl -X POST https://your-domain.com/api/posture \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "posture_type": "good",
    "confidence": 0.95,
    "keypoints": {}
  }'`}
          </code>
        </div>

        <p className="text-sm text-gray-600 mt-3">
          ⚠️ Keep this key secure! Anyone with this key can send data to your account.
        </p>
      </div>

      {/* Voice Alert Settings */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <Mic className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Voice Alert Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Threshold */}
          <div>
            <label className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  Alert Delay
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {settings.bad_posture_threshold} seconds
              </span>
            </label>
            <input
              type="range"
              min="3"
              max="30"
              step="1"
              value={settings.bad_posture_threshold}
              onChange={(e) => handleChange('bad_posture_threshold', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-xs text-gray-500 mt-2">
              Wait this many seconds before voice alert after detecting bad posture
            </p>
          </div>

          {/* Voice Alert Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Voice Alerts</p>
                <p className="text-xs text-gray-600">Text-to-speech warnings</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.voice_alert_enabled}
                onChange={(e) => handleChange('voice_alert_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Voice Language
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleChange('voice_language', 'vi-VN')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                  settings.voice_language === 'vi-VN'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🇻🇳 Tiếng Việt
              </button>
              <button
                onClick={() => handleChange('voice_language', 'en-US')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                  settings.voice_language === 'en-US'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🇺🇸 English
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {settings.voice_language === 'vi-VN' 
                ? 'Example: "Tư thế ngồi không đúng! Hãy ngồi thẳng lưng."'
                : 'Example: "Bad posture detected! Please sit up straight."'
              }
            </p>
          </div>

          {/* Alert Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Alert Frequency
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleChange('alert_frequency', 'every_time')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                  settings.alert_frequency === 'every_time'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Every Detection
              </button>
              <button
                onClick={() => handleChange('alert_frequency', 'once_per_session')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                  settings.alert_frequency === 'once_per_session'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Once Per Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <button
            onClick={async () => {
              if (confirm('Are you sure? This will delete all your posture history.')) {
                const { data: { user } } = await supabase.auth.getUser()
                await supabase.from('posture_records').delete().eq('user_id', user.id)
                setMessage({ type: 'success', text: 'All records deleted' })
                setTimeout(() => window.location.reload(), 1500)
              }
            }}
            className="w-full px-4 py-3 bg-white border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Posture History
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => loadSettings()}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}