import InfoTooltip from './InfoTooltip'

export default function StatCard({ label, value, sub, tooltip }) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
