import type { Color } from '../domain/repertoire/tree'

/** Radio group for choosing which side a repertoire is played from. */
export default function SideField({
  name,
  value,
  onChange,
}: {
  name: string
  value: Color
  onChange: (color: Color) => void
}) {
  return (
    <fieldset className="field">
      <legend>Your side</legend>
      <div className="choices">
        {(['white', 'black'] as const).map((color) => (
          <label key={color} className="choice">
            <input
              type="radio"
              name={name}
              value={color}
              checked={value === color}
              onChange={() => onChange(color)}
            />
            {color === 'white' ? 'White' : 'Black'}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
