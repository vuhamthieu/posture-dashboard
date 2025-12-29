// src/app/(app)/history/page.js
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, AlertCircle, CheckCircle, Filter, Search } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext';

export default function HistoryPage() {
  const [records, setRecords] = useState([])
  const [filteredRecords, setFilteredRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, good, bad
  const [searchDate, setSearchDate] = useState('')
  const supabase = createClient()
  const { t } = useLanguage();

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [records, filter, searchDate])

  const loadHistory = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('posture_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500)

    if (data) {
      setRecords(data)
    }
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...records]

    // Filter by type
    if (filter === 'good') {
      filtered = filtered.filter(r => r.posture_type === 'good')
    } else if (filter === 'bad') {
      filtered = filtered.filter(r => r.posture_type !== 'good')
    }

    // Filter by date
    if (searchDate) {
      filtered = filtered.filter(r => {
        const recordDate = new Date(r.created_at).toISOString().split('T')[0]
        return recordDate === searchDate
      })
    }

    setFilteredRecords(filtered)
  }

  const getPostureInfo = (type) => {

    const cleanType = type ? type.toString().toLowerCase().trim() : 'unknown';
    if (cleanType === 'good') {
      return {
        label: t.status_good || 'Good Posture',
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: CheckCircle
      }
    }

    if (cleanType.includes('lean') || cleanType.includes('forward')) {
      return {
        label: t.status_lean || 'Nghiêng Người (Leaning)',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: AlertCircle
      }
    }

    if (cleanType.includes('tilt')) {
      return {
        label: t.status_titl || 'Nghiêng Đầu (Tilt)',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: AlertCircle
      }
    }

    if (cleanType.includes('slouch') || cleanType.includes('hunch')) {
      return {
        label: t.status_hunch || 'Gù Lưng (Slouching)',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: AlertCircle
      }
    }

    return {
      label: `${t.status_unknown || 'Unknown'} (${cleanType})`, 
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: AlertCircle
    }
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
  }

  const groupByDate = (records) => {
    const groups = {}
    records.forEach(record => {
      const date = new Date(record.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(record)
    })
    return groups
  }

  const groupedRecords = groupByDate(filteredRecords)

  const stats = {
    total: records.length,
    good: records.filter(r => r.posture_type === 'good').length,
    bad: records.filter(r => r.posture_type !== 'good').length
  }

  const displayFilterName = (f) => {
    if (f === 'all') return t.all || 'All'
    if (f === 'good') return t.status_good || 'Good'
    if (f === 'bad') return t.status_bad || 'Bad'
    return f
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.history}</h1>
        <p className="text-gray-600 mt-1">{t.nav_desc || 'Review your past posture detections'}</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.total_records}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Calendar className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">{t.good_posture}</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.good}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">{t.status_bad}</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.bad}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Type Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              {t.filter_by_type}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {t.all}
              </button>
              <button
                onClick={() => setFilter('good')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'good'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {t.status_good}
              </button>
              <button
                onClick={() => setFilter('bad')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'bad'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {t.status_bad}
              </button>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              {t.search_by_date}
            </label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Active Filters */}
        {(filter !== 'all' || searchDate) && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">{t.active_filters}</span>
            {filter !== 'all' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                Type: {displayFilterName(filter)}
              </span>
            )}
            {searchDate && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                Date: {searchDate}
              </span>
            )}
            <button
              onClick={() => {
                setFilter('all')
                setSearchDate('')
              }}
              className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t.clear_all}
            </button>
          </div>
        )}
      </div>

      {/* Records Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t.timeline} ({filteredRecords.length} {t.records})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p>{t.loading_history || 'Loading history...'}</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t.no_records_found || 'No records found'}</p>
              <p className="text-sm mt-1">{t.try_adjust_filters || 'Try adjusting your filters'}</p>
            </div>
          ) : (
            Object.entries(groupedRecords).map(([date, dateRecords]) => (
              <div key={date} className="p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {date}
                  <span className="ml-auto text-xs font-normal text-gray-500">
                    {dateRecords.length} {t.records}
                  </span>
                </h3>
                <div className="space-y-3">
                  {dateRecords.map((record) => {
                    const info = getPostureInfo(record.posture_type)
                    const Icon = info.icon
                    const datetime = formatDateTime(record.created_at)

                    return (
                      <div
                        key={record.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border ${info.border} ${info.bg}`}
                      >
                        <div className={`w-10 h-10 rounded-full ${info.bg} border ${info.border} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${info.color}`} />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`font-semibold ${info.color}`}>
                              {info.label}
                            </p>
                            <span className="text-sm text-gray-600">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {datetime.time}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {t.confidence}: {(record.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}