import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>⚔️ Battle Simulator</h1>
      <p style={{ color: '#7d8590', marginBottom: '32px' }}>
        N7 — Turn-based combat with abilities, status effects, and replay recording.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Link href="/battle" className="btn">Start Battle</Link>
        <Link href="/replay" className="btn btn-secondary">View Replays</Link>
      </div>
    </main>
  )
}
