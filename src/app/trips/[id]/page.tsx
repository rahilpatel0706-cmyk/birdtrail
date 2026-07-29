'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Trip, Location, LOCATION_TYPE_CONFIG, LocationType, CUISINE_TYPES } from '@/lib/types'
import toast from 'react-hot-toast'
import LocationSearch from '@/components/LocationSearch'
import { fetchMultipleChecklists, getUniqueSpecies, extractChecklistId } from '@/lib/ebird'

export default function TripDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [trip, setTrip] = useState<Trip | null>(null)
const [locations, setLocations] = useState<Location[]>([])
const [sightings, setSightings] = useState<any[]>([])
const [loading, setLoading] = useState(true)
const [showForm, setShowForm] = useState(false)
const [showEditTrip, setShowEditTrip] = useState(false)
const [showEbird, setShowEbird] = useState(false)
const [editingLocation, setEditingLocation] = useState<Location | null>(null)
const [activeTab, setActiveTab] = useState('all')

 const loadData = async () => {
  setLoading(true)
  const { data: tripData } = await supabase.from('trips').select('*').eq('id', id).single()
  const { data: locData } = await supabase.from('locations').select('*').eq('trip_id', id).order('created_at')
  const { data: sightData } = await supabase.from('bird_sightings').select('*').eq('trip_id', id).order('common_name')
  setTrip(tripData)
  setLocations(locData || [])
  setSightings(sightData || [])
  setLoading(false)
}

  useEffect(() => {
    loadData()
  }, [id])

  const handleDeleteLocation = async (locId: string) => {
    if (!confirm('Delete this location?')) return
    const { error } = await supabase.from('locations').delete().eq('id', locId)
    if (error) toast.error('Failed to delete')
    else {
      toast.success('Deleted!')
      loadData()
    }
  }

  const handleDeleteTrip = async () => {
    if (!confirm('Delete this ENTIRE trip and all its locations?')) return
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else {
      toast.success('Trip deleted')
      router.push('/dashboard')
    }
  }

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  }) : ''

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ebird-600">Loading...</div>

  if (!trip) return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-6xl mb-4">🐦</div>
      <h2 className="text-xl font-bold">Trip not found</h2>
      <Link href="/dashboard" className="mt-4 text-ebird-600">Back to Dashboard</Link>
    </div>
  )

  const filtered = activeTab === 'all'
    ? locations
    : activeTab === 'food'
      ? locations.filter(l => ['food', 'restaurant', 'cafe', 'bar'].includes(l.type))
      : locations.filter(l => l.type === activeTab)

  const grouped = filtered.reduce((acc, loc) => {
    const key = loc.type
    if (!acc[key]) acc[key] = []
    acc[key].push(loc)
    return acc
  }, {} as Record<string, Location[]>)

  const tabs = [
    { id: 'all', label: 'All', count: locations.length },
    { id: 'birding_spot', label: '🐦 Birding', count: locations.filter(l => l.type === 'birding_spot').length },
    { id: 'stay', label: '🏨 Stays', count: locations.filter(l => l.type === 'stay').length },
    { id: 'food', label: '🍽️ Food', count: locations.filter(l => ['food', 'restaurant', 'cafe', 'bar'].includes(l.type)).length },
  ].filter(t => t.id === 'all' || t.count > 0)

  return (
    <div className="min-h-screen">
      <nav className="bg-ebird-500 shadow-lg">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/dashboard" className="flex items-center gap-2 text-white">
              <span className="text-2xl">🐦</span>
              <span className="font-bold text-lg">BirdTrail</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="bg-white border-b border-ebird-200">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <Link href="/dashboard" className="text-sm text-ebird-600 hover:text-ebird-700">
            ← Back to Dashboard
          </Link>

          <div className="flex items-start justify-between mt-3 flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span className="w-10 h-10 bg-ebird-100 rounded-xl flex items-center justify-center text-xl">
                  🐦
                </span>
                {trip.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                {trip.start_date && (
                  <span>📅 {formatDate(trip.start_date)}
                    {trip.end_date && trip.end_date !== trip.start_date && ` — ${formatDate(trip.end_date)}`}
                  </span>
                )}
                {(trip.region || trip.state) && (
                  <span>📍 {[trip.region, trip.state, trip.country].filter(Boolean).join(', ')}</span>
                )}
                {trip.status && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    trip.status === 'completed' ? 'bg-ebird-100 text-ebird-700' :
                    trip.status === 'ongoing' ? 'bg-orange-100 text-orange-700' :
                    'bg-sky-100 text-sky-700'
                  }`}>
                    {trip.status === 'completed' ? '✅ Completed' :
                     trip.status === 'ongoing' ? '🔄 Ongoing' : '📋 Planned'}
                  </span>
                )}
                {sightings.length > 0 && (
  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
    🐦 {sightings.length} species
  </span>
)}
              </div>

              {/* Map Links Section */}
              {(trip.overview_map_link || trip.explore_map_link || trip.ebird_trip_link) && (
  <div className="flex flex-wrap gap-2 mt-3">
    {trip.overview_map_link && (
      <a
        href={trip.overview_map_link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-sm font-medium border border-sky-200"
      >
        🗺️ Overview Location
      </a>
    )}
    {trip.explore_map_link && (
      <a
        href={trip.explore_map_link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ebird-50 text-ebird-700 hover:bg-ebird-100 rounded-lg text-sm font-medium border border-ebird-200"
      >
        📍 Location to Explore
      </a>
    )}
    {trip.ebird_trip_link && (
      <a
        href={trip.ebird_trip_link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-sm font-medium border border-orange-200"
      >
        🐦 View on eBird
      </a>
    )}
  </div>
)}

              {trip.notes && (
                <p className="mt-3 text-sm text-gray-600 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                  📝 {trip.notes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
  <button
    onClick={() => setShowEbird(true)}
    className="text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg text-sm font-medium border border-orange-300"
  >
    🐦 eBird Sync
  </button>
  <ShareButton trip={trip} onUpdate={loadData} />
  <button
    onClick={() => setShowEditTrip(true)}
    className="text-ebird-600 hover:bg-ebird-50 px-3 py-1.5 rounded-lg text-sm font-medium border border-ebird-300"
  >
    ✏️ Edit Trip
  </button>
  <button
    onClick={handleDeleteTrip}
    className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm"
  >
    🗑️ Delete
  </button>
</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-ebird-200 p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 ${
                  activeTab === tab.id ? 'bg-ebird-500 text-white' : 'text-gray-600 hover:bg-ebird-50'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="bg-ebird-500 hover:bg-ebird-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
          >
            + Add Location
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-ebird-100 p-12 text-center">
            <div className="text-5xl mb-3">📍</div>
            <p className="text-gray-500 mb-4">No locations yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-ebird-500 hover:bg-ebird-600 text-white px-4 py-2 rounded-lg font-medium text-sm"
            >
              + Add First Location
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, locs]) => {
              const config = LOCATION_TYPE_CONFIG[type as LocationType]
              return (
                <div key={type} className="bg-white rounded-lg border border-ebird-100 overflow-hidden">
                  <div className={`px-5 py-3 flex items-center gap-2 ${config?.bgColor || 'bg-gray-100'}`}>
                    <span className="text-lg">{config?.emoji || '📍'}</span>
                    <h3 className={`font-bold text-sm uppercase tracking-wider ${config?.color || 'text-gray-700'}`}>
                      {config?.label || type}
                    </h3>
                    <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full font-mono font-bold">
                      {locs.length}
                    </span>
                  </div>

                  <div className="divide-y divide-ebird-100">
                    {locs.map(loc => (
  <div key={loc.id} className="px-5 py-3 hover:bg-ebird-50">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-gray-800">{loc.name}</h4>
          {loc.description && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {loc.description}
            </span>
          )}
          {loc.cuisine_type && (
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              {loc.cuisine_type}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
          {loc.area && <span>📍 {loc.area}{loc.city && `, ${loc.city}`}</span>}
          {loc.cost && (
            <span className="text-ebird-600 font-medium">
              💰 {loc.currency === 'INR' ? '₹' : '$'}{loc.cost}
              {loc.cost_notes && <span className="text-gray-400 font-normal"> ({loc.cost_notes})</span>}
            </span>
          )}
          {loc.visit_notes && <span className="italic">📝 {loc.visit_notes}</span>}
          {loc.rating && (
            <span>{'⭐'.repeat(loc.rating)}</span>
          )}
        </div>
      </div>

      {/* Action buttons - always visible */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {loc.google_maps_link && (
          <a
            href={loc.google_maps_link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-sky-500 hover:bg-sky-50 rounded-lg text-base"
            title="Open in Google Maps"
          >
            🗺️
          </a>
        )}
        <button
          onClick={() => setEditingLocation(loc)}
          className="p-2 text-ebird-500 hover:text-ebird-700 hover:bg-ebird-50 rounded-lg text-base"
          title="Edit"
        >
          ✏️
        </button>
        <button
          onClick={() => handleDeleteLocation(loc.id)}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-base"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>
))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bird Sightings */}
        {sightings.length > 0 && (
          <div className="mt-6 bg-white rounded-lg border border-ebird-100 overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-2 bg-orange-100">
              <span className="text-lg">🐦</span>
              <h3 className="font-bold text-sm uppercase tracking-wider text-orange-700">
                Bird Sightings
              </h3>
              <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full font-mono font-bold">
                {sightings.length} species
              </span>
            </div>

            <div className="divide-y divide-ebird-100 max-h-96 overflow-y-auto">
              {sightings.map(bird => (
                <div key={bird.id} className="px-5 py-2.5 hover:bg-orange-50 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">
                      {bird.common_name}
                    </div>
                    {bird.scientific_name && (
                      <div className="text-xs text-gray-500 italic">
                        {bird.scientific_name}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {bird.count ? (
                      <span className="font-mono font-bold text-orange-600">×{bird.count}</span>
                    ) : (
                      <span className="text-gray-400">✓ seen</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
                )}
        </div>        

        

      {showForm && (
        <AddLocationModal
          tripId={id as string}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            loadData()
          }}
        />
      )}

            {showEditTrip && trip && (
        <EditTripModal
          trip={trip}
          onClose={() => setShowEditTrip(false)}
          onSuccess={() => {
            setShowEditTrip(false)
            loadData()
          }}
        />
      )}

      {showEbird && trip && (
        <EbirdSyncModal
          trip={trip}
          onClose={() => setShowEbird(false)}
          onSuccess={() => {
            setShowEbird(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

{editingLocation && (
  <EditLocationModal
    location={editingLocation}
    onClose={() => setEditingLocation(null)}
    onSuccess={() => {
      setEditingLocation(null)
      loadData()
    }}
  />
)}

// ============================================
// EDIT TRIP MODAL
// ============================================
function EditTripModal({ trip, onClose, onSuccess }: {
  trip: Trip
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: trip.name || '',
    start_date: trip.start_date || '',
    end_date: trip.end_date || '',
    region: trip.region || '',
    state: trip.state || '',
    country: trip.country || 'India',
    overview_map_link: trip.overview_map_link || '',
    explore_map_link: trip.explore_map_link || '',
    ebird_trip_link: trip.ebird_trip_link || '',
    notes: trip.notes || '',
    status: trip.status || 'completed',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('trips')
      .update({
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      })
      .eq('id', trip.id)

    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success('Trip updated! 🎉')
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-ebird-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ebird-800">✏️ Edit Trip</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
              Trip Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                📅 Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                📍 Region
              </label>
              <input
                type="text"
                value={form.region}
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                State
              </label>
              <input
                type="text"
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                🌍 Country
              </label>
              <select
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ebird-500"
              >
                <option value="India">🇮🇳 India</option>
                <option value="USA">🇺🇸 USA</option>
                <option value="UK">🇬🇧 UK</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
              🗺️ Overview Map Link
            </label>
            <input
              type="url"
              value={form.overview_map_link}
              onChange={e => setForm(f => ({ ...f, overview_map_link: e.target.value }))}
              className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ebird-500"
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
              📍 Location to Explore (Map Link)
            </label>
            <input
              type="url"
              value={form.explore_map_link}
              onChange={e => setForm(f => ({ ...f, explore_map_link: e.target.value }))}
              className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ebird-500"
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>

          <div>
  <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
    🐦 eBird Trip Link
  </label>
  <input
    type="url"
    value={form.ebird_trip_link}
    onChange={e => setForm(f => ({ ...f, ebird_trip_link: e.target.value }))}
    className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ebird-500"
    placeholder="https://ebird.org/tripreport/..."
  />
</div>


          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-2">
              Trip Status
            </label>
            <div className="flex gap-2">
              {[
                 { value: 'completed', label: '✅ Completed' },
                 { value: 'ongoing', label: '🔄 Ongoing' },
                 { value: 'planned', label: '📋 Planned' },
                ].map(status => (
             <button
                key={status.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, status: status.value as any }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                    form.status === status.value
                      ? 'bg-ebird-500 text-white border-ebird-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-ebird-300'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
              📝 Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-center px-4 py-2.5 border border-ebird-300 text-ebird-600 rounded-lg font-medium hover:bg-ebird-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-ebird-500 hover:bg-ebird-600 text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// ADD LOCATION MODAL (same as before)
// ============================================
function AddLocationModal({ tripId, onClose, onSuccess }: {
  tripId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: 'food' as LocationType,
    name: '',
    description: '',
    cuisine_type: '',
    area: '',
    city: '',
    google_maps_link: '',
    cost: '',
    currency: 'INR',
    cost_notes: '',
    visit_notes: '',
    rating: 0,
    num_beds: '',
    num_guests: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('locations').insert({
      trip_id: tripId,
      user_id: user.id,
      type: form.type,
      name: form.name,
      description: form.description || null,
      cuisine_type: form.cuisine_type || null,
      area: form.area || null,
      city: form.city || null,
      google_maps_link: form.google_maps_link || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      currency: form.currency,
      cost_notes: form.cost_notes || null,
      visit_notes: form.visit_notes || null,
      rating: form.rating || null,
      num_beds: form.num_beds ? parseInt(form.num_beds) : null,
      num_guests: form.num_guests ? parseInt(form.num_guests) : null,
    })

    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success('Location added! 🎉')
      onSuccess()
    }
    setLoading(false)
  }

  const isFood = ['food', 'restaurant', 'cafe', 'bar'].includes(form.type)
  const isStay = form.type === 'stay'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-ebird-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ebird-800">+ Add Location</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-2">
              Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(LOCATION_TYPE_CONFIG) as [LocationType, any][])
                .filter(([key]) => !['gas_station', 'other'].includes(key))
                .map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: key }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      form.type === key
                        ? 'bg-ebird-500 text-white border-ebird-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-ebird-300'
                    }`}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                ))}
            </div>
          </div>

          {/* Search Places */}
<div className="bg-ebird-50 p-3 rounded-lg border border-ebird-200">
  <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-2">
    🔍 Search for a Place (fills in details automatically)
  </label>
  <LocationSearch
    onSelect={(result) => {
      setForm(f => ({
        ...f,
        name: result.name,
        area: result.area,
        city: result.city,
        google_maps_link: result.google_maps_link,
      }))
      toast.success('Place details filled in! ✨')
    }}
  />
  <p className="text-xs text-gray-500 mt-2">
    💡 Tip: Search then edit the details below if needed
  </p>
</div>

<div>
  <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
    Name *
  </label>
  <input
    type="text"
    required
    value={form.name}
    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
    className="w-full px-4 py-2.5 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
    placeholder="e.g., Hotel Akash Palace"
  />
</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
                placeholder="e.g., Italian, Rooftop"
              />
            </div>
            {isFood && (
              <div>
                <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                  Cuisine
                </label>
                <select
                  value={form.cuisine_type}
                  onChange={e => setForm(f => ({ ...f, cuisine_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ebird-500"
                >
                  <option value="">Select...</option>
                  {CUISINE_TYPES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                📍 Area
              </label>
              <input
                type="text"
                value={form.area}
                onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
                placeholder="e.g., Chotila"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
                placeholder="e.g., Surendranagar"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
              🗺️ Google Maps Link
            </label>
            <input
              type="url"
              value={form.google_maps_link}
              onChange={e => setForm(f => ({ ...f, google_maps_link: e.target.value }))}
              className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ebird-500"
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                💰 Cost
              </label>
              <input
                type="number"
                value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ebird-500"
                placeholder="1200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ebird-500"
              >
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                Cost Notes
              </label>
              <input
                type="text"
                value={form.cost_notes}
                onChange={e => setForm(f => ({ ...f, cost_notes: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
                placeholder="1 bed, 4 people"
              />
            </div>
          </div>

          {isStay && (
            <div className="grid grid-cols-2 gap-3 bg-sky-50 p-3 rounded-lg border border-sky-200">
              <div>
                <label className="block text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1.5">
                  Beds
                </label>
                <input
                  type="number"
                  value={form.num_beds}
                  onChange={e => setForm(f => ({ ...f, num_beds: e.target.value }))}
                  className="w-full px-3 py-2 border border-sky-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1.5">
                  Guests
                </label>
                <input
                  type="number"
                  value={form.num_guests}
                  onChange={e => setForm(f => ({ ...f, num_guests: e.target.value }))}
                  className="w-full px-3 py-2 border border-sky-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="4"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
              📝 Visit Notes
            </label>
            <textarea
              value={form.visit_notes}
              onChange={e => setForm(f => ({ ...f, visit_notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500 resize-none"
              placeholder="e.g., Had dinner on 13th night"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-2">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, rating: f.rating === star ? 0 : star }))}
                  className="text-3xl hover:scale-110 transition-transform"
                >
                  {star <= form.rating ? '⭐' : '☆'}
                </button>
              ))}
              {form.rating > 0 && <span className="text-xs text-gray-500 ml-2">{form.rating}/5</span>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.name}
            className="w-full bg-ebird-500 hover:bg-ebird-600 text-white font-medium py-3 rounded-lg text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : `Add ${LOCATION_TYPE_CONFIG[form.type]?.label}`}
          </button>
        </form>
      </div>
    </div>
  )
}
// ============================================
// SHARE BUTTON
// ============================================
function ShareButton({ trip, onUpdate }: { trip: Trip, onUpdate: () => void }) {
  const supabase = createClient()
  const [showShare, setShowShare] = useState(false)
  const [copying, setCopying] = useState(false)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share/${trip.id}`
    : ''

  const togglePublic = async () => {
    const { error } = await supabase
      .from('trips')
      .update({ is_public: !trip.is_public })
      .eq('id', trip.id)

    if (error) {
      toast.error('Failed to update')
    } else {
      toast.success(trip.is_public ? '🔒 Trip is now private' : '🌍 Trip is now public!')
      onUpdate()
    }
  }

  const copyLink = async () => {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('📋 Link copied!')
    } catch {
      toast.error('Failed to copy')
    }
    setTimeout(() => setCopying(false), 2000)
  }

  return (
    <>
      <button
        onClick={() => setShowShare(true)}
        className="text-sky-600 hover:bg-sky-50 px-3 py-1.5 rounded-lg text-sm font-medium border border-sky-300"
      >
        📤 Share
      </button>

      {showShare && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-ebird-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ebird-800">📤 Share Trip</h2>
              <button onClick={() => setShowShare(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Public toggle */}
              <div className={`p-4 rounded-lg border-2 ${
                trip.is_public ? 'bg-ebird-50 border-ebird-300' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-gray-800">
                      {trip.is_public ? '🌍 Public' : '🔒 Private'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {trip.is_public
                        ? 'Anyone with the link can view'
                        : 'Only you can see this trip'}
                    </div>
                  </div>
                  <button
                    onClick={togglePublic}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      trip.is_public ? 'bg-ebird-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      trip.is_public ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Share link */}
              {trip.is_public && (
                <div>
                  <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                    🔗 Share this link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-3 py-2 border border-ebird-200 rounded-lg text-xs font-mono bg-gray-50"
                      onClick={e => e.currentTarget.select()}
                    />
                    <button
                      onClick={copyLink}
                      className={`px-4 py-2 rounded-lg font-medium text-sm ${
                        copying
                          ? 'bg-ebird-100 text-ebird-700'
                          : 'bg-ebird-500 text-white hover:bg-ebird-600'
                      }`}
                    >
                      {copying ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Quick share buttons */}
                  <div className="flex gap-2 mt-3">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Check out my birding trip: ${trip.name}\n${shareUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                    >
                      💬 WhatsApp
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(`My birding trip: ${trip.name}`)}&body=${encodeURIComponent(`Check out my trip:\n${shareUrl}`)}`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600"
                    >
                      ✉️ Email
                    </a>
                  </div>
                </div>
              )}

              {!trip.is_public && (
                <p className="text-xs text-gray-500 text-center">
                  Turn on Public to get a shareable link
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================
// EBIRD SYNC MODAL
// ============================================
function EbirdSyncModal({ trip, onClose, onSuccess }: {
  trip: Trip
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createClient()
  const [checklistIds, setChecklistIds] = useState<string[]>(
    (trip as any).ebird_checklist_ids?.length > 0
      ? (trip as any).ebird_checklist_ids
      : ['']
  )
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')

  const addChecklistField = () => {
    setChecklistIds([...checklistIds, ''])
  }

  const removeChecklistField = (index: number) => {
    setChecklistIds(checklistIds.filter((_, i) => i !== index))
  }

  const updateChecklistId = (index: number, value: string) => {
    const updated = [...checklistIds]
    updated[index] = value
    setChecklistIds(updated)
  }

  const handleSync = async () => {
    const validIds = checklistIds
      .map(id => id.trim())
      .filter(id => id.length > 0)
      .map(extractChecklistId)

    if (validIds.length === 0) {
      toast.error('Add at least one checklist ID')
      return
    }

    setLoading(true)
    setProgress('Fetching from eBird...')

    try {
      // Fetch data from eBird
      const { observations, errors } = await fetchMultipleChecklists(validIds)

      if (errors.length > 0) {
        toast.error(`Some checklists failed: ${errors.join(', ')}`)
      }

      if (observations.length === 0) {
        toast.error('No observations found')
        setLoading(false)
        return
      }

      setProgress(`Found ${observations.length} observations. Deduplicating...`)

      // Get unique species
      const uniqueSpecies = getUniqueSpecies(observations)

      setProgress(`Saving ${uniqueSpecies.length} species...`)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      // Delete existing sightings for this trip
      await supabase.from('bird_sightings').delete().eq('trip_id', trip.id)

      // Insert new sightings
      const sightingsToInsert = uniqueSpecies.map(obs => ({
        trip_id: trip.id,
        user_id: user.id,
        common_name: obs.comName,
        scientific_name: obs.sciName,
        species_code: obs.speciesCode,
        count: obs.howMany,
        observation_date: obs.obsDt ? obs.obsDt.split(' ')[0] : null,
        location_name: obs.locName,
        ebird_checklist_id: obs.subId,
      }))

      const { error: insertError } = await supabase
        .from('bird_sightings')
        .insert(sightingsToInsert)

      if (insertError) throw insertError

      // Update trip with checklist IDs
      await supabase
        .from('trips')
        .update({ ebird_checklist_ids: validIds })
        .eq('id', trip.id)

      toast.success(`🎉 Imported ${uniqueSpecies.length} species!`)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync')
      console.error(err)
    }

    setLoading(false)
    setProgress('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-ebird-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-orange-700 flex items-center gap-2">
            🐦 eBird Sync
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-gray-700">
            <p className="font-medium mb-1">📋 How to get checklist IDs:</p>
            <ol className="list-decimal list-inside text-xs space-y-1 text-gray-600">
              <li>Go to your eBird checklist page</li>
              <li>Copy the URL or just the ID (looks like <code className="bg-white px-1 rounded">S123456789</code>)</li>
              <li>Paste below — add multiple for the whole trip</li>
            </ol>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider">
              eBird Checklist IDs or URLs
            </label>

            {checklistIds.map((id, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={id}
                  onChange={e => updateChecklistId(index, e.target.value)}
                  placeholder="e.g., S123456789 or full eBird URL"
                  className="flex-1 px-3 py-2 border border-orange-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {checklistIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChecklistField(index)}
                    className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addChecklistField}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              + Add another checklist
            </button>
          </div>

          {progress && (
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm text-sky-700 flex items-center gap-2">
              <span className="animate-spin">⏳</span> {progress}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-ebird-300 text-ebird-600 rounded-lg font-medium hover:bg-ebird-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSync}
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Syncing...' : '🐦 Import from eBird'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            💡 Syncing will replace existing sightings for this trip
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// EDIT LOCATION MODAL
// ============================================
function EditLocationModal({ location, onClose, onSuccess }: {
  location: Location
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: location.type,
    name: location.name || '',
    description: location.description || '',
    cuisine_type: location.cuisine_type || '',
    area: location.area || '',
    city: location.city || '',
    google_maps_link: location.google_maps_link || '',
    cost: location.cost?.toString() || '',
    currency: location.currency || 'INR',
    cost_notes: location.cost_notes || '',
    visit_notes: location.visit_notes || '',
    rating: location.rating || 0,
    num_beds: location.num_beds?.toString() || '',
    num_guests: location.num_guests?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('locations').update({
      type: form.type,
      name: form.name,
      description: form.description || null,
      cuisine_type: form.cuisine_type || null,
      area: form.area || null,
      city: form.city || null,
      google_maps_link: form.google_maps_link || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      currency: form.currency,
      cost_notes: form.cost_notes || null,
      visit_notes: form.visit_notes || null,
      rating: form.rating || null,
      num_beds: form.num_beds ? parseInt(form.num_beds) : null,
      num_guests: form.num_guests ? parseInt(form.num_guests) : null,
    }).eq('id', location.id)

    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success('Location updated! ✨')
      onSuccess()
    }
    setLoading(false)
  }

  const isFood = ['food', 'restaurant', 'cafe', 'bar'].includes(form.type)
  const isStay = form.type === 'stay'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-ebird-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ebird-800">✏️ Edit Location</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-2">
              Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(LOCATION_TYPE_CONFIG) as [LocationType, any][])
                .filter(([key]) => !['gas_station', 'other'].includes(key))
                .map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: key }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      form.type === key
                        ? 'bg-ebird-500 text-white border-ebird-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-ebird-300'
                    }`}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
              Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
                placeholder="e.g., Italian, Rooftop"
              />
            </div>
            {isFood && (
              <div>
                <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                  Cuisine
                </label>
                <select
                  value={form.cuisine_type}
                  onChange={e => setForm(f => ({ ...f, cuisine_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ebird-500"
                >
                  <option value="">Select...</option>
                  {CUISINE_TYPES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                📍 Area
              </label>
              <input
                type="text"
                value={form.area}
                onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
              🗺️ Google Maps Link
            </label>
            <input
              type="url"
              value={form.google_maps_link}
              onChange={e => setForm(f => ({ ...f, google_maps_link: e.target.value }))}
              className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ebird-500"
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                💰 Cost
              </label>
              <input
                type="number"
                value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ebird-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ebird-500"
              >
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                Cost Notes
              </label>
              <input
                type="text"
                value={form.cost_notes}
                onChange={e => setForm(f => ({ ...f, cost_notes: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
              />
            </div>
          </div>

          {isStay && (
            <div className="grid grid-cols-2 gap-3 bg-sky-50 p-3 rounded-lg border border-sky-200">
              <div>
                <label className="block text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1.5">
                  Beds
                </label>
                <input
                  type="number"
                  value={form.num_beds}
                  onChange={e => setForm(f => ({ ...f, num_beds: e.target.value }))}
                  className="w-full px-3 py-2 border border-sky-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1.5">
                  Guests
                </label>
                <input
                  type="number"
                  value={form.num_guests}
                  onChange={e => setForm(f => ({ ...f, num_guests: e.target.value }))}
                  className="w-full px-3 py-2 border border-sky-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
              📝 Visit Notes
            </label>
            <textarea
              value={form.visit_notes}
              onChange={e => setForm(f => ({ ...f, visit_notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-2">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, rating: f.rating === star ? 0 : star }))}
                  className="text-3xl hover:scale-110 transition-transform"
                >
                  {star <= form.rating ? '⭐' : '☆'}
                </button>
              ))}
              {form.rating > 0 && <span className="text-xs text-gray-500 ml-2">{form.rating}/5</span>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-ebird-300 text-ebird-600 rounded-lg font-medium hover:bg-ebird-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.name}
              className="flex-1 bg-ebird-500 hover:bg-ebird-600 text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}