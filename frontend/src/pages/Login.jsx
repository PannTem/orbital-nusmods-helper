import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_BASE || '/api'

export default function Login() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')

  async function handleSuccess(credentialResponse) {
    setStatus('Signing in…')
    try {
      const res = await fetch(`${BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      })
      if (!res.ok) throw new Error('Login failed')
      const user = await res.json()
      localStorage.setItem('user', JSON.stringify(user))
      navigate('/')
    } catch (e) {
      setStatus('Server is starting up — please try signing in again in 30 seconds.')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>NUSMods <span style={styles.accent}>Helper</span></h1>
        <p style={styles.subtitle}>Sign in to continue</p>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setStatus('Google sign-in failed. Please try again.')}
        />
        {status && <p style={styles.status}>{status}</p>}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
  },
  card: {
    background: '#1e293b',
    borderRadius: 12,
    padding: '48px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    boxShadow: '0 4px 24px rgba(0,0,0,.4)',
  },
  title: { color: 'white', fontSize: 28, fontWeight: 700, margin: 0 },
  accent: { color: '#60a5fa' },
  subtitle: { color: '#94a3b8', margin: 0, fontSize: 15 },
  status: { color: '#f59e0b', fontSize: 13, textAlign: 'center', margin: 0, maxWidth: 260 },
}
