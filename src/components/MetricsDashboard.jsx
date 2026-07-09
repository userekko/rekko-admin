import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../supabaseClient'
import StatCard from './StatCard'

const BAR_COLOR = '#00897B'

function pct(n, total) {
  if (!total) return '0%'
  return `${((n / total) * 100).toFixed(1)}%`
}

export default function MetricsDashboard() {
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')
  const [loading, setLoading] = useState(true)

  const [crashFreeRate, setCrashFreeRate] = useState(null)
  const [crashError, setCrashError] = useState('')
  const [crashLoading, setCrashLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats')
      if (cancelled) return
      if (error) {
        setStatsError(error.message || 'Failed to load dashboard stats.')
      } else {
        setStats(data)
      }
      setLoading(false)
    }

    async function loadCrashStats() {
      const { data, error } = await supabase.functions.invoke('get-crash-stats')
      if (cancelled) return
      if (error) {
        setCrashError(error.message || 'Failed to load crash-free rate.')
      } else if (data?.error) {
        setCrashError(
          data.error === 'not_configured'
            ? 'Crash-free rate needs the SENTRY_AUTH_TOKEN secret configured on the get-crash-stats function.'
            : data.message || 'Failed to load crash-free rate.',
        )
      } else if (typeof data?.crash_free_rate === 'number') {
        setCrashFreeRate(data.crash_free_rate)
      } else {
        setCrashError('Unexpected response from get-crash-stats.')
      }
      setCrashLoading(false)
    }

    loadStats()
    loadCrashStats()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="card">Loading metrics…</div>
  }

  if (statsError) {
    return (
      <div className="card error-card">
        <strong>Couldn't load the dashboard.</strong>
        <p>{statsError}</p>
      </div>
    )
  }

  const dauMauRatio = stats.mau > 0 ? ((stats.dau / stats.mau) * 100).toFixed(1) : '0.0'

  const streakData = [
    { bucket: '0 days', count: stats.streak_distribution?.['0_days'] ?? 0 },
    { bucket: '1-6 days', count: stats.streak_distribution?.['1_6_days'] ?? 0 },
    { bucket: '7-29 days', count: stats.streak_distribution?.['7_29_days'] ?? 0 },
    { bucket: '30+ days', count: stats.streak_distribution?.['30_plus_days'] ?? 0 },
  ]

  const adoption = stats.feature_adoption ?? {}
  const adoptionRows = [
    { key: 'recipe_import_users', label: 'Recipe import' },
    { key: 'wearable_connected_users', label: 'Wearable connected' },
    { key: 'coach_usage_users', label: 'Coach usage' },
    { key: 'body_measurements_users', label: 'Body measurements' },
  ]
  const adoptionData = adoptionRows.map((row) => ({
    feature: row.label,
    count: adoption[row.key] ?? 0,
  }))

  return (
    <div className="dashboard">
      <section>
        <h2 className="section-title">Growth &amp; Retention</h2>
        <div className="stat-grid">
          <StatCard label="Total users" value={stats.total_users} />
          <StatCard label="New signups (7d)" value={stats.new_signups_7d} />
          <StatCard label="New signups (30d)" value={stats.new_signups_30d} />
          <StatCard label="DAU" value={stats.dau} />
          <StatCard label="MAU" value={stats.mau} />
          <StatCard label="DAU/MAU (stickiness)" value={`${dauMauRatio}%`} />
          <StatCard label="Account deletions (7d)" value={stats.account_deletions_7d} />
          <StatCard label="Account deletions (30d)" value={stats.account_deletions_30d} />
        </div>

        <div className="card">
          <h3 className="subsection-title">Deletion reasons</h3>
          {stats.deletion_reasons && stats.deletion_reasons.length > 0 ? (
            <ul className="reason-list">
              {stats.deletion_reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">No reasons recorded yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="section-title">Engagement</h2>

        <div className="card">
          <h3 className="subsection-title">Streak distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={streakData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="bucket" stroke="#999" />
              <YAxis allowDecimals={false} stroke="#999" />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #333' }}
              />
              <Bar dataKey="count" fill={BAR_COLOR} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="subsection-title">Feature adoption</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={adoptionData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" allowDecimals={false} stroke="#999" />
              <YAxis type="category" dataKey="feature" stroke="#999" width={140} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #333' }}
              />
              <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="adoption-table">
            {adoptionRows.map((row) => (
              <div className="adoption-row" key={row.key}>
                <span>{row.label}</span>
                <span>
                  {adoption[row.key] ?? 0} ({pct(adoption[row.key] ?? 0, stats.total_users)})
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Support</h2>
        <div className="stat-grid">
          <StatCard label="Open feedback" value={stats.open_feedback_count} />
          <StatCard label="Resolved feedback" value={stats.resolved_feedback_count} />
        </div>
      </section>

      <section>
        <h2 className="section-title">Stability</h2>
        <div className="card">
          <h3 className="subsection-title">Crash-free rate (30d)</h3>
          {crashLoading ? (
            <p className="empty-text">Loading…</p>
          ) : crashError ? (
            <p className="error-text">{crashError}</p>
          ) : (
            <div className="stat-value large">{crashFreeRate.toFixed(2)}%</div>
          )}
        </div>
      </section>
    </div>
  )
}
