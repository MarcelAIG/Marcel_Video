import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

function App() {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkConnection() {
      if (supabase) {
        try {
          const { error } = await supabase.from('_health_check').select('*').limit(1)
          setConnected(!error || error.code === 'PGRST116')
        } catch {
          setConnected(false)
        }
      }
    }
    checkConnection()
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>Built with AI Studio</h1>
        <p>The fastest path from prompt to production with Gemini.</p>
        {supabase && (
          <p className="status">
            Supabase: {connected === null ? 'Connecting...' : connected ? 'Connected' : 'Ready'}
          </p>
        )}
      </header>
      <main className="main">
        <a
          href="https://aistudio.google.com/apps"
          target="_blank"
          rel="noopener noreferrer"
          className="cta-button"
        >
          Start Building
        </a>
      </main>
    </div>
  )
}

export default App
