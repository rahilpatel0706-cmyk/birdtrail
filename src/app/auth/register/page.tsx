'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    username: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          username: form.username,
        },
      },
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Account created! Redirecting...')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ebird-500 via-ebird-600 to-ebird-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 text-4xl">
            🐦
          </div>
          <h1 className="text-3xl font-bold text-white">Join BirdTrail</h1>
          <p className="text-ebird-100 mt-1">Start tracking your birding adventures</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={e => setForm(f => ({
                    ...f,
                    username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                  }))}
                  className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
                  placeholder="birder_123"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
                placeholder="birder@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 border border-ebird-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ebird-500"
                placeholder="Min 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ebird-500 hover:bg-ebird-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-ebird-600 font-medium hover:text-ebird-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}