'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Trip } from '@/lib/types'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCountry, setFilterCountry] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)

      const { data: tripsData } = await supabase
        .from('trips')
        .select('*, locations(id, type, name, cost)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })

      const tripsWithCounts = (tripsData || []).map(trip => ({
        ...trip,
        location_counts: {
          food: trip.locations?.filter((l: any) =>
            ['food', 'restaurant', 'cafe', 'bar'].includes(l.type)).length || 0,
          stay: trip.locations?.filter((l: any) => l.type === 'stay').length || 0,
          birding_spot: trip.locations?.filter((l: any) => l.type === 'birding_spot').length || 0,
          total: trip.locations?.length || 0,
        }
      }))

      setTrips(tripsWithCounts)
      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out!')
    router.push('/auth/login')
  }

  const formatDate = (date: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  // Get unique countries for filter dropdown
  const countries = useMemo(() => {
    const set = new Set(trips.map(t => t.country).filter(Boolean))
    return Array.from(set)
  }, [trips])

  // Apply filters and search
  const filteredTrips = useMemo(() => {
    let result = [...trips]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.region?.toLowerCase().includes(q) ||
        t.state?.toLowerCase().includes(q) ||
        t.country?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
      )
    }

    // Country filter
    if (filterCountry !== 'all') {
      result = result.filter(t => t.country === filterCountry)
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus)
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sortBy === 'most_locations') {
      result.sort((a, b) => (b.location_counts?.total || 0) - (a.location_counts?.total || 0))
    }

    return result
  }, [trips, search, filterCountry, filterStatus, sortBy])

  const stats = {
    trips: trips.length,
    food: trips.reduce((sum, t) => sum + (t.location_counts?.food || 0), 0),
    stays: trips.reduce((sum, t) => sum + (t.location_counts?.stay || 0), 0),
    birding: trips.reduce((sum, t) => sum + (t.location_counts?.birding_spot || 0), 0),
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ebird-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="bg-ebird-500 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/dashboard" className="flex items-center gap-2 text-white">
              <span className="text-2xl">🐦</span>
              <span className="font-bold text-lg">BirdTrail</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-ebird-100 text-sm hidden sm:block">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-white text-sm hover:bg-white/10 px-3 py-1.5 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-r from-ebird-600 to-ebird-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              🔭 My BirdTrail
            </h1>
            <p className="text-ebird-100 mt-1">
              Your birding travel journal at a glance
            </p>
          </div>
          <Link
            href="/trips/new"
            className="bg-sunset-500 hover:bg-sunset-400 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg"
          >
            + New Trip
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard emoji="🔭" label="Trips" value={stats.trips} bg="bg-ebird-500" />
          <StatCard emoji="🐦" label="Birding Spots" value={stats.birding} bg="bg-emerald-500" />
          <StatCard emoji="🍽️" label="Food Places" value={stats.food} bg="bg-orange-500" />
          <StatCard emoji="🏨" label="Stays" value={stats.stays} bg="bg-sky-500" />
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-md border border-ebird-100 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ebird-400">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search trips by name, region, country..."
                className="w-full pl-10 pr-10 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Country Filter */}
            {countries.length > 1 && (
              <select
                value={filterCountry}
                onChange={e => setFilterCountry(e.target.value)}
                className="px-3 py-2 border border-ebird-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ebird-500"
              >
                <option value="all">🌍 All Countries</option>
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-ebird-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ebird-500"
            >
              <option value="all">All Status</option>
              <option value="completed">✅ Completed</option>
              <option value="ongoing">🔄 Ongoing</option>
              <option value="planned">📋 Planned</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 border border-ebird-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ebird-500"
            >
              <option value="newest">📅 Newest First</option>
              <option value="oldest">📆 Oldest First</option>
              <option value="name">🔤 Name (A-Z)</option>
              <option value="most_locations">📍 Most Locations</option>
            </select>
          </div>

          {/* Results count */}
          {(search || filterCountry !== 'all' || filterStatus !== 'all') && (
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
              <span>Showing <strong>{filteredTrips.length}</strong> of {trips.length} trips</span>
              <button
                onClick={() => {
                  setSearch('')
                  setFilterCountry('all')
                  setFilterStatus('all')
                }}
                className="text-ebird-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Trips List */}
        <div className="bg-white rounded-lg shadow-md border border-ebird-100">
          <div className="px-5 py-4 border-b border-ebird-100 flex items-center justify-between">
            <h2 className="font-bold text-lg text-ebird-800">
              📅 Your Trips
            </h2>
            <span className="text-sm text-gray-500 font-mono">
              {filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'}
            </span>
          </div>

          {trips.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🐦</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No trips yet!
              </h3>
              <p className="text-gray-500 mb-4">
                Start by creating your first birding trip
              </p>
              <Link
                href="/trips/new"
                className="inline-block bg-ebird-500 hover:bg-ebird-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                + Create First Trip
              </Link>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-500">No trips match your search</p>
            </div>
          ) : (
            <div className="divide-y divide-ebird-100">
              {filteredTrips.map(trip => (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="block px-5 py-4 hover:bg-ebird-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800">
                          {trip.name}
                        </h3>
                        {trip.status && trip.status !== 'completed' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            trip.status === 'ongoing' ? 'bg-orange-100 text-orange-700' :
                            'bg-sky-100 text-sky-700'
                          }`}>
                            {trip.status === 'ongoing' ? '🔄 Ongoing' : '📋 Planned'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {trip.start_date && <span>📅 {formatDate(trip.start_date)}</span>}
                        {trip.region && <span>📍 {[trip.region, trip.state, trip.country].filter(Boolean).join(', ')}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      {trip.location_counts?.birding_spot ? (
                        <span className="text-ebird-600">🐦 {trip.location_counts.birding_spot}</span>
                      ) : null}
                      {trip.location_counts?.food ? (
                        <span className="text-orange-500">🍽️ {trip.location_counts.food}</span>
                      ) : null}
                      {trip.location_counts?.stay ? (
                        <span className="text-sky-500">🏨 {trip.location_counts.stay}</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="mt-16 text-center text-sm text-gray-500 py-6">
        🐦 BirdTrail — Built for birders, by birders
      </footer>
    </div>
  )
}

function StatCard({ emoji, label, value, bg }: { emoji: string, label: string, value: number, bg: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-ebird-100 p-4 flex flex-col items-center">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 text-xl ${bg}`}>
        {emoji}
      </div>
      <span className="font-mono text-2xl font-bold text-ebird-600">{value}</span>
      <span className="text-xs text-gray-500 font-medium mt-0.5">{label}</span>
    </div>
  )
}