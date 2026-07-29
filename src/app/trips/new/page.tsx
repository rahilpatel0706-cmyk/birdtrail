'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function NewTripPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    region: '',
    state: '',
    country: 'India',
    overview_map_link: '',
    explore_map_link: '',
    notes: '',
    status: 'completed',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Please log in')
      router.push('/auth/login')
      return
    }

    const { data, error } = await supabase
      .from('trips')
      .insert({
        ...form,
        user_id: user.id,
        end_date: form.end_date || form.start_date || null,
        start_date: form.start_date || null,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Trip created! 🎉')
    router.push(`/trips/${data.id}`)
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
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-ebird-600 hover:text-ebird-700 mb-6"
        >
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow-md border border-ebird-100">
          <div className="px-6 py-5 border-b border-ebird-100 bg-ebird-500 rounded-t-lg">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              🐦 Submit a New Trip
            </h1>
            <p className="text-ebird-100 text-sm mt-1">
              Log your birding adventure details
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Trip Name */}
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
                placeholder="e.g., Chotila/Anandpur Vidi"
              />
            </div>

            {/* Dates */}
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

            {/* Location */}
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
                  placeholder="Saurashtra"
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
                  placeholder="Gujarat"
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

            {/* Map Links */}
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

            {/* Status */}
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
                    onClick={() => setForm(f => ({ ...f, status: status.value }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
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

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-ebird-600 uppercase tracking-wider mb-1.5">
                📝 Notes
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500 resize-none"
                placeholder="Any additional notes about this trip..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/dashboard"
                className="flex-1 text-center px-4 py-2.5 border border-ebird-300 text-ebird-600 rounded-lg font-medium hover:bg-ebird-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !form.name}
                className="flex-1 bg-ebird-500 hover:bg-ebird-600 text-white font-medium py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : '🐦 Create Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}