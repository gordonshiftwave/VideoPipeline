import { HORIZON_WAVE_PATH, HORIZON_WAVE_VIEWBOX } from "../brand/horizonWave"

type WaveMarkProps = {
  className?: string
  title?: string
}

/** Official Shiftwave wave lines only — black isotype, no filled badge. */
export function WaveMark({ className = "h-8 w-[5.75rem] text-cta", title }: WaveMarkProps) {
  return (
    <svg
      className={className}
      viewBox={HORIZON_WAVE_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path fill="currentColor" fillRule="evenodd" d={HORIZON_WAVE_PATH} />
    </svg>
  )
}
