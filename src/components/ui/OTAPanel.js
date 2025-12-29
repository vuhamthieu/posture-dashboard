"use client"

import { useState, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function OTAPanel() {
  const [status, setStatus] = useState('checking')
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [loadingAction, setLoadingAction] = useState(null) 
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info') // 'success', 'error', 'info'
  const [pendingCommands, setPendingCommands] = useState([])
  const [lastCommandId, setLastCommandId] = useState(null)
  const { t } = useLanguage();

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 10000) // Check every 10s 
    return () => clearInterval(interval)
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/ota')
      if (res.ok) {
        const data = await res.json()
        setStatus('online')
        setDeviceInfo(data)
        setPendingCommands(data.pending_commands || [])
        
        // Check if last command completed
        if (lastCommandId && data.pending_commands) {
          const wasCompleted = !data.pending_commands.find(cmd => cmd.id === lastCommandId)
          if (wasCompleted) {
            setMessage('Command executed successfully!')
            setMessageType('success')
            setLastCommandId(null)
            setTimeout(() => setMessage(''), 5000)
          }
        }
        
        console.log('[OTA] Status check: online', data)
      } else {
        setStatus('offline')
        setDeviceInfo(null)
        console.warn('[OTA] Status check: offline')
      }
    } catch (error) {
      setStatus('offline')
      setDeviceInfo(null)
      console.error('[OTA] Status check failed:', error)
    }
  }

  const sendCommand = async (action) => {
    setLoadingAction(action)
    setMessage(action === 'update' ? 'Sending update command...' : 'Sending restart command...')
    setMessageType('info')

    try {
      console.log(`[OTA] Sending ${action} command...`)
      
      const res = await fetch('/api/ota', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action }) 
      })
      
      const data = await res.json()
      console.log('[OTA] Response:', data)

      if (res.ok && data.success) {
        setMessage(data.message || `Command ${action} queued successfully!`)
        setMessageType('success')
        setLastCommandId(data.command_id) 
        console.log('[OTA] Command queued successfully:', data.command_id)
      } else {
        setMessage(`Error: ${data.error || 'Failed to queue command'}`)
        setMessageType('error')
        console.error('[OTA] Command failed:', data.error)
      }
    } catch (error) {
      setMessage(`Network error: ${error.message}`)
      setMessageType('error')
      console.error('[OTA] Network error:', error)
    } finally {
      setLoadingAction(null)
      setTimeout(() => {
        setMessage('')
        setMessageType('info')
      }, 8000) 
    }
  }

  // Message styling based on type
  const getMessageStyle = () => {
    switch (messageType) {
      case 'success':
        return 'bg-green-50 text-green-900 border-green-100 dark:bg-green-100 dark:text-green-900 dark:border-green-800'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-100 dark:text-red-900 dark:border-red-800'
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-100 dark:text-blue-900 dark:border-blue-800'
    }
  }

  const getMessageIcon = () => {
    switch (messageType) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />
      case 'error':
        return <XCircle className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {t.firm_mag || 'Firmware Management'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t.cloud_broker || 'Remote control via Cloud Broker'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            status === 'online' ? 'bg-green-500 animate-pulse' : 
            status === 'offline' ? 'bg-red-500' : 
            'bg-yellow-500 animate-pulse'
          }`} />
          <span className="text-sm font-medium text-gray-700">
            {status === 'online'
              ? (t?.connect_db || 'Connected to broker')
              : status === 'offline'
              ? (t?.status_disconnect || 'Disconnected')
              : (t?.status_checking || 'Checking...')}
          </span>
        </div>
      </div>

      {/* Device Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
           <span className="text-sm text-gray-600">{t.target_device || 'Target Device'}</span>
           <code className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
             {deviceInfo?.device_id || 'pi-posture-001'}
           </code>
        </div>
        <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
           <span className="text-sm text-gray-600">{t.connect_mode || 'Connection Mode'}</span>
           <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
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
          className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 px-6 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md"
        >
          {loadingAction === 'update' ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{t.queuing_update || 'Queuing Update...'}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              <span>{t.pull_update || 'Pull Updates from GitHub'}</span>
            </>
          )}
        </button>

        {/* RESTART BUTTON */}
        <button
          onClick={() => sendCommand('restart')}
          disabled={!!loadingAction || status !== 'online'}
          className="flex-1 bg-orange-600 hover:bg-orange-700 py-3 px-6 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md"
        >
          {loadingAction === 'restart' ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{t.queuing_restart || 'Queuing Restart...'}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span>{t.restart || 'Restart Bot'}</span>
            </>
          )}
        </button>
      </div>

      {/* Message Area */}
      {message && (
        <div className={`mt-6 p-4 rounded-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${getMessageStyle()}`}>
          {getMessageIcon()}
          <span className="flex-1">{message}</span>
        </div>
      )}

      {/* Pending Commands */}
      {pendingCommands.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Pending Commands ({pendingCommands.length})
          </h3>
          <div className="space-y-2">
            {pendingCommands.map((cmd, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-yellow-800 bg-yellow-100 px-3 py-2 rounded">
                <span className="font-mono">{cmd.command}</span>
                <span className="text-yellow-600">
                  {cmd.status} • {new Date(cmd.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Info*/}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono text-gray-600">
          <div>Status: {status}</div>
          <div>Device: {deviceInfo?.device_id || 'N/A'}</div>
          <div>Loading: {loadingAction || 'None'}</div>
          <div>Message Type: {messageType}</div>
        </div>
      )} */}
    </div>
  )
}