export default function RangeSlider({ low, high, onChange }) {
  const trackFill = {
    left:  `${low}%`,
    right: `${100 - high}%`,
  };
  return (
    <div className="rk-range-slider">
      <div className="rk-range-track-bg">
        <div className="rk-range-track-fill" style={trackFill} />
        <input
          type="range" min={0} max={100} value={low}
          className="rk-range-input rk-range-low"
          style={{ zIndex: low > 95 ? 5 : 3 }}
          onChange={(e) => onChange([Math.min(+e.target.value, high), high])}
        />
        <input
          type="range" min={0} max={100} value={high}
          className="rk-range-input rk-range-high"
          style={{ zIndex: 3 }}
          onChange={(e) => onChange([low, Math.max(+e.target.value, low)])}
        />
      </div>
      <div className="rk-range-vals">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
