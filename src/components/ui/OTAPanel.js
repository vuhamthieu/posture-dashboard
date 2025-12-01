"use client"

import { useState, useEffect } from 'react'

export default function OTAPanel() {
  const [status, setStatus] = useState('checking')
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30000) 
    return () => clearInterval(interval)
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/ota')
      if (res.ok) {
        const data = await res.json()
        setStatus('online')
        setDeviceInfo(data)
      } else {
        const error = await res.json()
        if (error.offline) {
          setStatus('offline')
          setDeviceInfo(null)
        }
      }
    } catch {
      setStatus('offline')
      setDeviceInfo(null)
    }
  }

  const triggerUpdate = async () => {
    setUpdating(true)
    setMessage('Checking GitHub for updates...')

    try {
      const res = await fetch('/api/ota', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await res.json()

      if (res.ok && data.success) {
        if (data.updated) {
          setMessage(`Updated to version ${data.version}`)
          setTimeout(checkStatus, 5000) 
        } else {
          setMessage('ℹAlready up to date!')
        }
      } else {
        setMessage(`${data.error || data.message}`)
      }
    } catch (error) {
      setMessage(`Network error: ${error.message}`)
    } finally {
      setUpdating(false)
      setTimeout(() => setMessage(''), 10000)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-black flex items-center gap-2">
            Firmware Update
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Over-the-air update via GitHub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            status === 'online' ? 'bg-green-500 animate-pulse' : 
            status === 'offline' ? 'bg-red-500' : 
            'bg-yellow-500 animate-pulse'
          }`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {status === 'online' ? 'Online' : 
             status === 'offline' ? 'Offline' : 
             'Checking...'}
          </span>
        </div>
      </div>

      {/* Device Info */}
      {deviceInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-sm text-gray-600">Version</span>
            <code className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-sm font-mono">
              {deviceInfo.version}
            </code>
          </div>
          
          <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-sm text-gray-600">Bot Status</span>
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              deviceInfo.bot_running 
                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
            }`}>
              {deviceInfo.bot_running ? 'Running' : 'Stopped'}
            </span>
          </div>
        </div>
      )}

      {/* Update Button */}
      <button
        onClick={triggerUpdate}
        disabled={updating || status !== 'online'}
        className="dark:bg-blue-700 w-full py-3 px-6 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
      >
        {updating ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Updating...</span>
          </>
        ) : (
          <>
            <span className="" >Update from GitHub</span>
          </>
        )}
      </button>

      {/* Message */}
      {message && (
        <div className={`mt-4 p-4 rounded-lg text-sm font-medium ${
          message.includes('✅') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' :
          message.includes('❌') ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' :
          'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}