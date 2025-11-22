// src/app/(app)/page.js
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({ good: 0, bad: 0, total: 0 })
  const supabase = createClient()

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    // Load posture history
    const loadHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('posture_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (data && data.length > 0) {
        setHistory(data.reverse()) // Reverse để chart đúng thứ tự
        setLatest(data[data.length - 1])
        
        // Calculate stats
        const goodCount = data.filter(r => r.posture_type === 'good').length
        setStats({
          good: goodCount,
          bad: data.length - goodCount,
          total: data.length
        })
      }
    }
    loadHistory()

    // Realtime subscription
    const channel = supabase
      .channel('posture_changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'posture_records',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          setLatest(payload.new)
          setHistory(prev => [...prev.slice(-99), payload.new])
          
          // Update stats
          setStats(prev => ({
            ...prev,
            total: prev.total + 1,
            good: payload.new.posture_type === 'good' ? prev.good + 1 : prev.good,
            bad: payload.new.posture_type !== 'good' ? prev.bad + 1 : prev.bad
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Determine posture status
  const getPostureStatus = (type) => {
    switch(type) {
      case 'good': return { label: 'GOOD POSTURE', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle }
      case 'slouching': return { label: 'SLOUCHING', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertCircle }
      case 'forward_head': return { label: 'FORWARD HEAD', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertCircle }
      case 'leaning': return { label: 'LEANING', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle }
      default: return { label: 'UNKNOWN', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: Activity }
    }
  }

  const status = latest ? getPostureStatus(latest.posture_type) : getPostureStatus('unknown')
  const StatusIcon = status.icon
  const confidence = latest?.confidence ? (latest.confidence * 100).toFixed(0) : '--'
  const goodPercentage = stats.total > 0 ? ((stats.good / stats.total) * 100).toFixed(0) : 0

  // Prepare chart data
  const chartData = history.map(record => ({
    time: new Date(record.created_at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    // Convert posture to numeric score for chart (good=100, bad=0)
    score: record.posture_type === 'good' ? 100 : 0,
    type: record.posture_type
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Posture Monitor Dashboard</h1>
        <p className="text-gray-600 mt-1">Real-time posture tracking and analytics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Current Status */}
        <div className={`${status.bg} rounded-xl p-6 border border-gray-200`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Current Status</span>
            <StatusIcon className={`w-5 h-5 ${status.color}`} />
          </div>
          <p className={`text-2xl font-bold ${status.color}`}>{status.label}</p>
          <p className="text-sm text-gray-600 mt-2">Confidence: {confidence}%</p>
        </div>

        {/* Good Posture */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Good Posture</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.good}</p>
          <p className="text-sm text-green-600 mt-2">{goodPercentage}% of total</p>
        </div>

        {/* Bad Posture */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Alerts</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.bad}</p>
          <p className="text-sm text-red-600 mt-2">{stats.total - stats.good} warnings</p>
        </div>

        {/* Total Records */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Records</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-600 mt-2">All time</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Posture Timeline</h3>
            <p className="text-sm text-gray-600">Last 100 detections</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Good</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Bad</span>
            </div>
          </div>
        </div>

        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                domain={[0, 100]}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                ticks={[0, 50, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value, name, props) => [props.payload.type, 'Status']}
              />
              <Line 
                type="stepAfter" 
                dataKey="score" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No posture data yet</p>
              <p className="text-sm">Connect your Raspberry Pi to start monitoring</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Getting Started</h3>
            <p className="text-sm text-gray-600 mb-3">
              Connect your Raspberry Pi to start real-time posture monitoring. 
              The system will detect slouching, forward head posture, and other issues automatically.
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              View Setup Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}