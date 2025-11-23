// src/app/(app)/settings/page.js
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, Save, AlertCircle, CheckCircle, User, Trash2 } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [threshold, setThreshold] = useState(5)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    const { data } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setThreshold(data.bad_posture_threshold || 5)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    const { error } = await supabase
      .from('alert_settings')
      .upsert({
        user_id: user.id,
        bad_posture_threshold: threshold,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-2 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
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
          <h2 className="text-lg font-semibold text-gray-900">Account</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <p className="text-gray-900 font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Member Since</label>
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

      {/* Alert Settings */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Alert Settings</h2>
        </div>

        <div>
          <label className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900">
              Bad Posture Threshold
            </span>
            <span className="text-sm text-gray-600">
              {threshold} {threshold === 1 ? 'minute' : 'minutes'}
            </span>
          </label>
          <input
            type="range"
            min="1"
            max="15"
            step="1"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>1 min</span>
            <span>15 min</span>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Alert after detecting bad posture for this duration
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        </div>
        <button
          onClick={async () => {
            if (confirm('⚠️ Are you sure? This will permanently delete all your posture history. This action cannot be undone.')) {
              const { data: { user } } = await supabase.auth.getUser()
              await supabase.from('posture_records').delete().eq('user_id', user.id)
              setMessage({ type: 'success', text: 'All posture history deleted' })
              setTimeout(() => window.location.reload(), 1500)
            }
          }}
          className="w-full px-4 py-3 bg-white border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear All Posture History
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={loadSettings}
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