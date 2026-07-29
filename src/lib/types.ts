export type LocationType =
  | 'birding_spot' | 'stay' | 'food' | 'restaurant'
  | 'cafe' | 'bar' | 'grocery' | 'convenience'
  | 'attraction' | 'gas_station' | 'other'

export type TripStatus = 'planned' | 'ongoing' | 'completed'

export interface Trip {
  id: string
  user_id: string
  name: string
  start_date: string
  end_date: string
  region?: string
  state?: string
  country: string
  overview_map_link?: string
  explore_map_link?: string
  cover_photo_url?: string
  notes?: string
  is_public: boolean
  status: TripStatus
  created_at: string
  updated_at: string
  locations?: Location[]
  location_counts?: {
    food: number
    stay: number
    birding_spot: number
    total: number
  }
}

export interface Location {
  id: string
  trip_id: string
  user_id: string
  type: LocationType
  name: string
  description?: string
  cuisine_type?: string
  area?: string
  city?: string
  state?: string
  country?: string
  google_maps_link?: string
  latitude?: number
  longitude?: number
  cost?: number
  currency: string
  cost_notes?: string
  num_beds?: number
  num_guests?: number
  visit_date?: string
  visit_notes?: string
  rating?: number
  photos: string[]
  created_at: string
}

export const LOCATION_TYPE_CONFIG: Record<LocationType, {
  label: string
  emoji: string
  color: string
  bgColor: string
}> = {
  birding_spot: { label: 'Birding Spot', emoji: '🐦', color: 'text-ebird-600', bgColor: 'bg-ebird-100' },
  stay: { label: 'Stay', emoji: '🏨', color: 'text-sky-600', bgColor: 'bg-blue-100' },
  food: { label: 'Food', emoji: '🍽️', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  restaurant: { label: 'Restaurant', emoji: '🍕', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  cafe: { label: 'Café', emoji: '☕', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  bar: { label: 'Bar', emoji: '🍷', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  grocery: { label: 'Grocery', emoji: '🛒', color: 'text-teal-600', bgColor: 'bg-teal-100' },
  convenience: { label: 'Convenience', emoji: '🏪', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  attraction: { label: 'Attraction', emoji: '📸', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  gas_station: { label: 'Gas Station', emoji: '⛽', color: 'text-red-600', bgColor: 'bg-red-100' },
  other: { label: 'Other', emoji: '📍', color: 'text-gray-600', bgColor: 'bg-gray-100' },
}

export const CUISINE_TYPES = [
  'Italian', 'Indian', 'South Indian', 'Thai', 'Mexican',
  'Chinese', 'Japanese', 'Mediterranean', 'American', 'Vegan',
  'Fast Food', 'Pizza', 'Burger', 'Falafel', 'Sandwich',
  'Bakery', 'Café', 'Ice Cream', 'Dessert', 'Bar',
  'Rooftop', 'Street Food', 'Chaat', 'Gujarati', 'Punjabi',
  'Other',
]