"use client"

import { useState, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext';

export default function OTAPanel() {
  const [status, setStatus] = useState('checking')
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [loadingAction, setLoadingAction] = useState(null) 
  const [message, setMessage] = useState('')
  const { t } = useLanguage();

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
        setStatus('offline')
        setDeviceInfo(null)
      }
    } catch {
      setStatus('offline')
      setDeviceInfo(null)
    }
  }

  const sendCommand = async (action) => {
    setLoadingAction(action)
    setMessage(action === 'update' ? 'Sending update command...' : 'Sending restart command...')

    try {
      const res = await fetch('/api/ota', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action }) 
      })
      
      const data = await res.json()

      if (res.ok && data.success) {
        setMessage(`${data.message}`) 
      } else {
        setMessage(`Error: ${data.error || 'Failed to queue command'}`)
      }
    } catch (error) {
      setMessage(`Network error: ${error.message}`)
    } finally {
      setLoadingAction(null)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {t.firm_mag}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t.cloud_broker}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            status === 'online' ? 'bg-green-500' : 
            status === 'offline' ? 'bg-red-500' : 
            'bg-yellow-500 animate-pulse'
          }`} />
          <span className="text-sm font-medium text-gray-700 dark:text-black-300">
            {status === 'online'
              ? (t?.connect_db || 'Connected to broker')
              : status === 'offline'
              ? (t?.status_disconnect || 'Disconnected')
              : (t?.status_checking || 'Checking...')}
          </span>
        </div>
      </div>

      {/* Device Info*/}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-200 rounded-lg">
           <span className="text-sm text-gray-600 dark:text-black-300">{t.target_device}</span>
           <code className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-mono">
             {deviceInfo?.device_id || 'pi-posture-001'}
           </code>
        </div>
        <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-200 rounded-lg">
           <span className="text-sm text-gray-600 dark:text-black-300">{t.connect_mode}</span>
           <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded text-sm font-medium">
             Cloud Broker
           </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 flex-col sm:flex-row">
        {/* UPDATE BUTTON */}
        <button
          onClick={() => sendCommand('update')}
          disabled={!!loadingAction || status !== 'online'}
          className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 py-3 px-6 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md"
        >
          {loadingAction === 'update' ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{t.queuing_update}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>{t.pull_update}</span>
            </>
          )}
        </button>

        {/* RESTART BUTTON */}
        <button
          onClick={() => sendCommand('restart')}
          disabled={!!loadingAction || status !== 'online'}
          className="flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 py-3 px-6 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md"
        >
          {loadingAction === 'restart' ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Queuing Restart...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span>{t.restart}</span>
            </>
          )}
        </button>
      </div>

      {/* Message Area */}
      {message && (
        <div className={`mt-6 p-4 rounded-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
          message.includes('') 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}