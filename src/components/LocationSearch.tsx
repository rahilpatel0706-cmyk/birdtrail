'use client'
import { useState, useEffect, useRef } from 'react'

interface SearchResult {
  place_id: string
  display_name: string
  lat: string
  lon: string
  type: string
  address: {
    name?: string
    road?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

interface Props {
  onSelect: (result: {
    name: string
    area: string
    city: string
    latitude: number
    longitude: number
    google_maps_link: string
  }) => void
}

export default function LocationSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Search with debounce (wait 400ms after typing stops)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 3) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8`,
          {
            headers: {
              'Accept-Language': 'en',
            }
          }
        )
        const data = await res.json()
        setResults(data)
        setShowResults(true)
      } catch (err) {
        console.error('Search failed:', err)
      }
      setLoading(false)
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleSelect = (result: SearchResult) => {
    // Extract the place name (first part of display_name)
    const nameParts = result.display_name.split(',')
    const name = nameParts[0].trim()

    // Extract area and city from address
    const area = result.address?.suburb ||
                 result.address?.neighbourhood ||
                 result.address?.road ||
                 nameParts[1]?.trim() || ''

    const city = result.address?.city ||
                 result.address?.town ||
                 result.address?.village ||
                 result.address?.state || ''

    // Generate Google Maps link from coordinates
    const google_maps_link = `https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lon}`

    onSelect({
      name,
      area,
      city,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      google_maps_link,
    })

    setQuery('')
    setResults([])
    setShowResults(false)
  }

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ebird-400 text-lg">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 3 && setShowResults(true)}
          placeholder="Search a place... (e.g., Hotel Akash Palace Chotila)"
          className="w-full pl-10 pr-10 py-2.5 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ebird-400 text-sm">
            ⏳
          </span>
        )}
        {query && !loading && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-ebird-200 max-h-80 overflow-y-auto">
          {results.map((result) => {
            const parts = result.display_name.split(',')
            const name = parts[0].trim()
            const location = parts.slice(1, 4).join(',').trim()

            return (
              <button
                key={result.place_id}
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left px-4 py-3 hover:bg-ebird-50 border-b border-ebird-100 last:border-b-0 flex items-start gap-3 transition-colors"
              >
                <span className="text-ebird-500 mt-0.5">📍</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm truncate">
                    {name}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {location}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showResults && !loading && query.length >= 3 && results.length === 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-ebird-200 p-4 text-sm text-gray-500 text-center">
          No places found. Try a different search or add manually below.
        </div>
      )}
    </div>
  )
}