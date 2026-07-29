'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Welcome back!')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ebird-500 via-ebird-600 to-ebird-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 text-4xl">
            🐦
          </div>
          <h1 className="text-3xl font-bold text-white">BirdTrail</h1>
          <p className="text-ebird-100 mt-1">Sign in to your birding journal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-ebird-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ebird-500 text-sm"
                placeholder="birder@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-ebird-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ebird-500 text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ebird-500 hover:bg-ebird-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-ebird-600 font-medium hover:text-ebird-700">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-ebird-100 text-xs mt-6">
          Built for birders, by birders 🐦
        </p>
      </div>
    </div>
  )
}