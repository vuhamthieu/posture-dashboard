'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    // Load history
    const loadHistory = async () => {
      const { data } = await supabase
        .from('posture_logs')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100)
      setHistory(data || [])
      if (data?.length) setLatest(data[data.length - 1])
    }
    loadHistory()

    // Realtime
    const channel = supabase
      .channel('public:posture_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posture_logs' }, (payload) => {
        setLatest(payload.new)
        setHistory(prev => [...prev.slice(-99), payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const angle = latest?.neck_angle?.toFixed(1) || '—'
  const status = latest?.status || 'UNKNOWN'
  const color = status === 'OK' ? 'text-green-400' : status === 'BAD' ? 'text-yellow-400' : 'text-red-500'

  const chartData = history.map(h => ({
    time: new Date(h.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    angle: h.neck_angle
  }))

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-8">Realtime Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <h2 className="text-8xl font-bold text-white mb-4">{angle}°</h2>
            <p className={`text-5xl font-bold ${color}`}>{status}</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl text-gray-300 mb-4">Neck Angle – Last 100 records</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis domain={[0, 90]} stroke="#888" />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none' }} />
                <Line type="monotone" dataKey="angle" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}