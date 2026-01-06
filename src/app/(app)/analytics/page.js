'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Calendar, Clock, Activity, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext';

export default function AnalyticsPage() {
    const [records, setRecords] = useState([])
    const [totalCount, setTotalCount] = useState(0)
    const [timeRange, setTimeRange] = useState('week')
    const [loading, setLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [lastUpdate, setLastUpdate] = useState(new Date())
    const supabase = createClient()
    const { t } = useLanguage();

    useEffect(() => {
        loadData()
        const interval = setInterval(() => {
            loadData(true)
        }, 10000)

        return () => clearInterval(interval)
    }, [timeRange])

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setLoading(false)
            return
        }

        // Calculate date range
        let startDate = new Date()
        if (timeRange === 'week') {
            startDate.setDate(startDate.getDate() - 7)
        } else if (timeRange === 'month') {
            startDate.setMonth(startDate.getMonth() - 1)
        } else {
            startDate = new Date(0) // All time
        }

        console.log(`[Analytics] Loading data from ${startDate.toISOString()}`)

        // ✅ PAGINATION - Load ALL data in chunks
        let allData = []
        let page = 0
        const PAGE_SIZE = 1000
        let totalInDB = 0

        try {
            while (true) {
                const { data, error, count } = await supabase
                    .from('posture_records')
                    .select('*', { count: 'exact' })
                    .eq('user_id', user.id)
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: true })
                    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

                if (error) {
                    console.error('[Analytics] Load error:', error)
                    break
                }

                if (count !== null) totalInDB = count

                if (!data || data.length === 0) {
                    break // No more data
                }

                allData = [...allData, ...data]

                // Update progress
                const progress = totalInDB > 0 ? Math.round((allData.length / totalInDB) * 100) : 0
                setLoadingProgress(progress)

                console.log(`[Analytics] Loaded page ${page + 1}: ${data.length} records (Total so far: ${allData.length}/${totalInDB}) - ${progress}%`)

                if (data.length < PAGE_SIZE) {
                    break
                }

                page++
                
                if (page >= 20) {
                    console.warn('[Analytics] Stopped at 20k records for performance')
                    break
                }
            }

            console.log(`[Analytics] ✅ Loaded ${allData.length} records (Total in DB: ${totalInDB})`)
            setRecords(allData)
            setTotalCount(totalInDB)
            setLoadingProgress(100)
            setLastUpdate(new Date())

        } catch (err) {
            console.error('[Analytics] Fatal error:', err)
        }

        setLoading(false)
    }

    const checkType = (record, type) => {
        const t = record.posture_type ? record.posture_type.toString().toLowerCase().trim() : '';

        if (type === 'good') return t === 'good';

        if (type === 'slouching') return t.includes('slouch') || t.includes('hunch');

        if (type === 'leaning') return t.includes('lean') || t.includes('forward');

        if (type === 'tilt') return t.includes('tilt');

        return false;
    }

    const stats = {
        total: records.length,
        good: records.filter(r => checkType(r, 'good')).length,
        slouching: records.filter(r => checkType(r, 'slouching')).length,
        tilt: records.filter(r => checkType(r, 'tilt')).length,
        leaning: records.filter(r => checkType(r, 'leaning')).length,
    }

    stats.unknown = stats.total - (stats.good + stats.slouching + stats.tilt + stats.leaning);
    if (stats.unknown < 0) stats.unknown = 0;

    stats.bad = stats.total - stats.good
    stats.goodPercentage = stats.total > 0 ? ((stats.good / stats.total) * 100).toFixed(1) : 0
    stats.avgConfidence = records.length > 0
        ? (records.reduce((sum, r) => sum + (r.confidence || 0), 0) / records.length * 100).toFixed(0)
        : 0

    // Pie chart data
    const pieData = [
        { name: t.status_good || 'Good', value: stats.good, color: '#10b981' },
        { name: t.status_hunch || 'Slouching', value: stats.slouching, color: '#f59e0b' },
        { name: t.status_lean || 'Leaning', value: stats.leaning, color: '#f97316' },
        { name: t.status_titl || 'Tilt', value: stats.tilt, color: '#ef4444' },
    ].filter(item => item.value > 0)

    // Hourly distribution
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const hourRecords = records.filter(r => {
            const recordHour = new Date(r.created_at).getHours()
            return recordHour === hour
        })
        return {
            hour: `${hour}:00`,
            good: hourRecords.filter(r => checkType(r, 'good')).length,
            bad: hourRecords.filter(r => !checkType(r, 'good')).length,
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
            good: dayRecords.filter(r => checkType(r, 'good')).length,
            bad: dayRecords.filter(r => !checkType(r, 'good')).length,
            total: dayRecords.length
        }
    })

    // Posture type breakdown
    const typeData = [
        { name: t.status_good || 'Good', count: stats.good, color: '#10b981' },
        { name: t.status_hunch || 'Slouching', count: stats.slouching, color: '#f59e0b' },
        { name: t.status_lean || 'Leaning', count: stats.leaning, color: '#f97316' },
        { name: t.status_titl || 'Tilt', count: stats.tilt, color: '#ef4444' },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t.analytics || 'Analytics'}</h1>
                    <p className="text-gray-600 mt-1">
                        {t.realtime_tracking || 'Detailed insights into your posture habits'}
                        <span className="ml-2 text-xs text-gray-500">
                            {t.last_update}: {lastUpdate.toLocaleTimeString()}
                        </span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Manual Refresh Button */}
                    <button
                        onClick={() => loadData()}
                        disabled={loading}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t.refresh}
                    </button>

                    {/* Time Range Selector */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTimeRange('week')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeRange === 'week'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {t.last_7_days || 'Last 7 Days'}
                        </button>
                        <button
                            onClick={() => setTimeRange('month')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeRange === 'month'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {t.last_month || 'Last Month'}
                        </button>
                        <button
                            onClick={() => setTimeRange('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeRange === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {t.all_time || 'All Time'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading Progress */}
            {loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                        <span className="text-blue-900 font-medium">
                            {t.loading_analytics}{loadingProgress}%
                        </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                    <p className="text-sm text-blue-700 mt-2">
                        {t.loaded} {records.length} / {totalCount} {t.records}
                    </p>
                </div>
            )}

            {/* Debug Info (Remove in production) */}
            {/* {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                    <strong>Debug Info:</strong> {stats.total} records loaded / {totalCount} total in DB | 
                    Time range: {timeRange} | 
                    Good: {stats.good} | Bad: {stats.bad}
                    {stats.total < totalCount && (
                        <span className="ml-2 text-red-600 font-semibold">
                            Missing {totalCount - stats.total} records!
                        </span>
                    )}
                </div>
            )} */}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm opacity-90">{t.good_posture || 'Good Posture'}</span>
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold">{stats.goodPercentage}%</p>
                    <p className="text-sm opacity-90 mt-2">{stats.good}/{stats.total} {t.records}</p>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm opacity-90">{t.status_bad || 'Bad Posture'}</span>
                        <TrendingDown className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold">{(100 - stats.goodPercentage).toFixed(1)}%</p>
                    <p className="text-sm opacity-90 mt-2">{stats.bad} {t.alerts || 'warnings'}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm opacity-90">{t.confidence || 'Avg Confidence'}</span>
                        <Activity className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold">{stats.avgConfidence}%</p>
                    <p className="text-sm opacity-90 mt-2">{t.detection_acc || 'Detection accuracy'}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm opacity-90">{t.total_records || 'Total Records'}</span>
                        <Calendar className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-sm opacity-90 mt-2">{t.detection_log || 'Detections logged'}</p>
                </div>
            </div>

            {/* No Data Warning */}
            {!loading && stats.total === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No data for selected time range
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Try selecting "All Time" or make sure your device is sending data.
                    </p>
                    <button
                        onClick={() => setTimeRange('all')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        View All Time
                    </button>
                </div>
            )}

            {/* Charts Grid */}
            {stats.total > 0 && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Daily Trend */}
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.daily_trend || 'Daily Trend'}</h3>
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
                                    <Bar dataKey="good" fill="#10b981" name={t.status_good || 'Good'} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="bad" fill="#ef4444" name={t.status_bad || 'Bad'} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Posture Distribution */}
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.posture_dis || 'Posture Distribution'}</h3>
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
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.hourly_pattern || 'Hourly Activity Pattern'}</h3>
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
                                    <Line type="monotone" dataKey="good" stroke="#10b981" strokeWidth={2} name={t.status_good || 'Good'} />
                                    <Line type="monotone" dataKey="bad" stroke="#ef4444" strokeWidth={2} name={t.status_bad || 'Bad'} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Posture Type Breakdown */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.posture_breakdown || 'Posture Type Breakdown'}</h3>
                        <div className="space-y-4">
                            {typeData.map((type) => (
                                <div key={type.name}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">{type.name}</span>
                                        <span className="text-sm text-gray-600">{type.count} {t.records}</span>
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
                </>
            )}
        </div>
    )
}