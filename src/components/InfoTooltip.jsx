export default function InfoTooltip({ text }) {
  return (
    <span className="info-tooltip">
      <span className="info-icon" tabIndex={0} role="button" aria-label="More info">
        ⓘ
      </span>
      <span className="info-tooltip-text">{text}</span>
    </span>
  )
}
