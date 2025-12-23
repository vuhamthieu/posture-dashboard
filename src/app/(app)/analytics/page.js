// src/app/(app)/analytics/page.js
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Calendar, Clock, Activity } from 'lucide-react'

export default function AnalyticsPage() {
    const [records, setRecords] = useState([])
    const [timeRange, setTimeRange] = useState('week') // week, month, all
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [timeRange])

    const loadData = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Calculate date range
        let startDate = new Date()
        if (timeRange === 'week') {
            startDate.setDate(startDate.getDate() - 7)
        } else if (timeRange === 'month') {
            startDate.setMonth(startDate.getMonth() - 1)
        } else {
            startDate = new Date(0) // All time
        }

        const { data, error } = await supabase
            .from('posture_records')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true })

        if (data) {
            setRecords(data)
        }
        setLoading(false)
    }

    // Calculate statistics
    const stats = {
        total: records.length,
        good: records.filter(r => r.posture_type === 'good').length,
        slouching: records.filter(r => r.posture_type === 'slouching').length,
        tilt: records.filter(r => r.posture_type === 'tilt').length,
        leaning: records.filter(r => r.posture_type === 'leaning').length,
    }

    stats.bad = stats.total - stats.good
    stats.goodPercentage = stats.total > 0 ? ((stats.good / stats.total) * 100).toFixed(1) : 0
    stats.avgConfidence = records.length > 0
        ? (records.reduce((sum, r) => sum + r.confidence, 0) / records.length * 100).toFixed(0)
        : 0

    // Pie chart data
    const pieData = [
        { name: 'Good Posture', value: stats.good, color: '#10b981' },
        { name: 'Slouching', value: stats.slouching, color: '#f59e0b' },
        { name: 'Forward Head', value: stats.forwardHead, color: '#f97316' },
        { name: 'Leaning', value: stats.leaning, color: '#ef4444' },
    ].filter(item => item.value > 0)

    // Hourly distribution
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const hourRecords = records.filter(r => {
            const recordHour = new Date(r.created_at).getHours()
            return recordHour === hour
        })
        return {
            hour: `${hour}:00`,
            good: hourRecords.filter(r => r.posture_type === 'good').length,
            bad: hourRecords.filter(r => r.posture_type !== 'good').length,
        }
    }).filter(d => d.good > 0 || d.bad > 0)

    // Daily trend (last 7 days)
    const dailyData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dayRecords = records.filter(r => {
            const recordDate = new Date(r.created_at).toDateString()
            return recordDate === date.toDateString()
        })
        return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            good: dayRecords.filter(r => r.posture_type === 'good').length,
            bad: dayRecords.filter(r => r.posture_type !== 'good').length,
            total: dayRecords.length
        }
    })

    // Posture type breakdown
    const typeData = [
        { name: 'Good', count: stats.good, color: '#10b981' },
        { name: 'Slouching', count: stats.slouching, color: '#f59e0b' },
        { name: 'Forward Head', count: stats.forwardHead, color: '#f97316' },
        { name: 'Leaning', count: stats.leaning, color: '#ef4444' },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                    <p className="text-gray-600 mt-1">Detailed insights into your posture habits</p>
                </div>

                {/* Time Range Selector */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setTimeRange('week')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeRange === 'week'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Last 7 Days
                    </button>
                    <button
                        onClick={() => setTimeRange('month')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeRange === 'month'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Last Month
                    </button>
                    <button
                        onClick={() => setTimeRange('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeRange === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        All Time
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm opacity-90">Good Posture</span>
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold">{stats.goodPercentage}%</p>
                    <p className="text-sm opacity-90 mt-2">{stats.good} of {stats.total} records</p>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm opacity-90">Bad Posture</span>
                        <TrendingDown className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold">{(100 - stats.goodPercentage).toFixed(1)}%</p>
                    <p className="text-sm opacity-90 mt-2">{stats.bad} warnings</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm opacity-90">Avg Confidence</span>
                        <Activity className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold">{stats.avgConfidence}%</p>
                    <p className="text-sm opacity-90 mt-2">Detection accuracy</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm opacity-90">Total Records</span>
                        <Calendar className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-sm opacity-90 mt-2">Detections logged</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Trend */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="good" fill="#10b981" name="Good" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="bad" fill="#ef4444" name="Bad" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Posture Distribution */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Posture Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Hourly Activity */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Activity Pattern</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="hour" stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="good" stroke="#10b981" strokeWidth={2} name="Good" />
                            <Line type="monotone" dataKey="bad" stroke="#ef4444" strokeWidth={2} name="Bad" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Posture Type Breakdown */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Posture Type Breakdown</h3>
                <div className="space-y-4">
                    {typeData.map((type) => (
                        <div key={type.name}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">{type.name}</span>
                                <span className="text-sm text-gray-600">{type.count} records</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${stats.total > 0 ? (type.count / stats.total * 100) : 0}%`,
                                        backgroundColor: type.color
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}