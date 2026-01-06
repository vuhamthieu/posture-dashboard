'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function OTAPanel({ deviceId }) {
  const [status, setStatus] = useState('checking')
  const [loadingAction, setLoadingAction] = useState(null) 
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info') 
  const [pendingCommands, setPendingCommands] = useState([])
  const [lastCommandId, setLastCommandId] = useState(null)
  const [checkingVersion, setCheckingVersion] = useState(false)
  const [latestVersion, setLatestVersion] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(null)
  const [hasUpdate, setHasUpdate] = useState(false)
  const { t } = useLanguage();

  useEffect(() => {
    if (deviceId) {
      checkStatus()
      const interval = setInterval(checkStatus, 5000) 
      return () => clearInterval(interval)
    }
  }, [deviceId]) 

  const checkStatus = async () => {
    if (!deviceId) return;

    try {
      const res = await fetch(`/api/ota?deviceId=${deviceId}`)
      
      if (res.ok) {
        const data = await res.json()
        setStatus('online') 
        setPendingCommands(data.pending_commands || [])
        
        if (lastCommandId && data.pending_commands) {
          const stillPending = data.pending_commands.find(cmd => cmd.id === lastCommandId)
          if (!stillPending) {
            setMessage('Lệnh đã được thực thi thành công!')
            setMessageType('success')
            setLastCommandId(null)
            setTimeout(() => setMessage(''), 5000)
          }
        }
      } else {
        setStatus('offline')
      }
    } catch (error) {
      console.error('[OTA] Status check failed:', error)
      setStatus('offline')
    }
  }

  const sendCommand = async (action) => {
    if (!deviceId) return;

    setLoadingAction(action)
    setMessage(action === 'UPDATE_CODE' ? 'Đang gửi lệnh cập nhật...' : 'Đang gửi lệnh khởi động lại...')
    setMessageType('info')

    try {
      console.log(`[OTA] Sending ${action} to ${deviceId}...`)
      
      const res = await fetch('/api/ota', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: action,
            deviceId: deviceId 
        }) 
      })
      
      const data = await res.json()

      if (res.ok && data.success) {
        setMessage('Đã gửi lệnh thành công! Đang chờ Pi xử lý...')
        setMessageType('success')
        setLastCommandId(data.command_id) 
      } else {
        setMessage(`Lỗi: ${data.error || 'Không thể gửi lệnh'}`)
        setMessageType('error')
      }
    } catch (error) {
      setMessage(`Lỗi mạng: ${error.message}`)
      setMessageType('error')
    } finally {
      setLoadingAction(null)
    }
  }

  const checkForUpdate = async () => {
    if (!deviceId) return;
    setCheckingVersion(true)
    setMessage('Đang kiểm tra phiên bản mới...')
    setMessageType('info')

    try {
      const res = await fetch(`/api/ota?deviceId=${deviceId}&checkVersion=1`)
      if (res.ok) {
        const data = await res.json()
        // expected data: { latest_version, current_version, has_update }
        setLatestVersion(data.latest_version || null)
        setCurrentVersion(data.current_version || null)
        setHasUpdate(!!data.has_update)

        if (data.has_update) {
          setMessage(`Phiên bản mới sẵn sàng: ${data.latest_version}`)
          setMessageType('success')
        } else {
          setMessage('Không có phiên bản mới')
          setMessageType('info')
        }
      } else {
        setMessage('Không thể kiểm tra phiên bản')
        setMessageType('error')
      }
    } catch (error) {
      setMessage(`Lỗi mạng khi kiểm tra: ${error.message}`)
      setMessageType('error')
    } finally {
      setCheckingVersion(false)
      setTimeout(() => setMessage(''), 7000)
    }
  }

  // Helper styles
  const getMessageStyle = () => {
    switch (messageType) {
      case 'success': return 'bg-green-50 text-green-900 border border-green-200'
      case 'error': return 'bg-red-50 text-red-700 border border-red-200'
      default: return 'bg-blue-50 text-blue-700 border border-blue-200'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 mt-1">
            Điều khiển từ xa qua Cloud Broker
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium text-gray-700">
            {status === 'online' ? 'Sẵn sàng' : 'Mất kết nối / Chưa rõ'}
          </span>
        </div>
      </div>

      {/* Device Info */}
      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg mb-6 border border-gray-200">
           <span className="text-sm text-gray-600 font-medium">Thiết bị đích:</span>
           <code className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded text-sm font-mono font-bold">
             {deviceId || 'Chưa chọn thiết bị'}
           </code>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 flex-col sm:flex-row">
        {/* CHECK VERSION BUTTON */}
        <button
          onClick={checkForUpdate}
          disabled={!!loadingAction || !deviceId}
          className="flex-1 bg-gray-200 hover:bg-gray-300 py-3 px-6 text-gray-800 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm"
        >
          {checkingVersion ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v6a4 4 0 004 4h10"></path>
            </svg>
          )}
          <span>{checkingVersion ? 'Đang kiểm tra...' : 'Kiểm tra phiên bản'}</span>
        </button>

        {/* UPDATE BUTTON*/}
        <button
          onClick={() => sendCommand('UPDATE_CODE')}
          disabled={!!loadingAction || !deviceId || !hasUpdate}
          className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 px-6 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md"
        >
          {loadingAction === 'UPDATE_CODE' ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
          )}
          <span>{loadingAction === 'UPDATE_CODE' ? 'Đang xếp hàng...' : (hasUpdate ? 'Tải về và cập nhật' : 'Cập nhật')}</span>
        </button>

        {/* RESTART BUTTON */}
        <button
          onClick={() => sendCommand('RESTART')}
          disabled={!!loadingAction || !deviceId}
          className="flex-1 bg-orange-600 hover:bg-orange-700 py-3 px-6 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md"
        >
          {loadingAction === 'RESTART' ? (
             <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          )}
          <span>{loadingAction === 'RESTART' ? 'Đang xếp hàng...' : 'Khởi động lại Pi'}</span>
        </button>
      </div>

      {/* Message Area */}
      {message && (
        <div className={`mt-6 p-4 rounded-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${getMessageStyle()}`}>
          {messageType === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
          <span className="flex-1">{message}</span>
        </div>
      )}

      {/* Pending Commands List */}
      {/* {pendingCommands.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Lệnh đang chờ xử lý ({pendingCommands.length})
          </h3>
          <div className="space-y-2">
            {pendingCommands.map((cmd, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-yellow-800 bg-yellow-100 px-3 py-2 rounded">
                <span className="font-mono font-bold">{cmd.command}</span>
                <span className="text-yellow-600">
                  {cmd.status} • {new Date(cmd.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )} */}
    </div>
  )
}