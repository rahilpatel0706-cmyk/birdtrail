'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Trip, Location, LOCATION_TYPE_CONFIG, LocationType } from '@/lib/types'

export default function SharedTripPage() {
  const { id } = useParams()
  const supabase = createClient()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .single()

      if (tripData) {
        const { data: locData } = await supabase
          .from('locations')
          .select('*')
          .eq('trip_id', id)
          .order('created_at')
        setTrip(tripData)
        setLocations(locData || [])
      }
      setLoading(false)
    }
    load()
  }, [id])

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  }) : ''

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ebird-600">Loading...</div>
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-700">Trip not found or not shared publicly</h2>
        <p className="text-gray-500 mt-2 text-center">
          This trip may be private or the link is incorrect.
        </p>
        <Link href="/" className="mt-6 text-ebird-600 hover:underline">
          Go to BirdTrail →
        </Link>
      </div>
    )
  }

  const grouped = locations.reduce((acc, loc) => {
    const key = loc.type
    if (!acc[key]) acc[key] = []
    acc[key].push(loc)
    return acc
  }, {} as Record<string, Location[]>)

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="bg-ebird-500 shadow-lg">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2 text-white">
              <span className="text-2xl">🐦</span>
              <span className="font-bold text-lg">BirdTrail</span>
            </Link>
            <span className="text-ebird-100 text-xs">📤 Shared Trip</span>
          </div>
        </div>
      </nav>

      {/* Trip Header */}
      <div className="bg-white border-b border-ebird-200">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="inline-block px-3 py-1 bg-ebird-100 text-ebird-700 rounded-full text-xs font-medium mb-3">
            📤 Publicly Shared Trip
          </div>

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
          </div>

          {/* Links */}
          {(trip.overview_map_link || trip.explore_map_link || trip.ebird_trip_link) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {trip.overview_map_link && (
                <a href={trip.overview_map_link} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-sm font-medium border border-sky-200">
                  🗺️ Overview
                </a>
              )}
              {trip.explore_map_link && (
                <a href={trip.explore_map_link} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ebird-50 text-ebird-700 hover:bg-ebird-100 rounded-lg text-sm font-medium border border-ebird-200">
                  📍 Location to Explore
                </a>
              )}
              {trip.ebird_trip_link && (
                <a href={trip.ebird_trip_link} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-sm font-medium border border-orange-200">
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
      </div>

      {/* Locations */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {locations.length === 0 ? (
          <div className="bg-white rounded-lg border border-ebird-100 p-12 text-center">
            <div className="text-5xl mb-3">📍</div>
            <p className="text-gray-500">No locations added yet</p>
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
                              {loc.rating && <span>{'⭐'.repeat(loc.rating)}</span>}
                            </div>
                          </div>
                          {loc.google_maps_link && (
                            <a href={loc.google_maps_link} target="_blank" rel="noopener noreferrer"
                               className="p-2 text-sky-500 hover:bg-sky-50 rounded-lg" title="Open in Google Maps">
                              🗺️
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <footer className="mt-8 text-center text-sm text-gray-500 py-6">
        <p>Shared via 🐦 BirdTrail</p>
        <Link href="/" className="text-ebird-600 hover:underline text-xs mt-2 inline-block">
          Create your own birding journal →
        </Link>
      </footer>
    </div>
  )
}