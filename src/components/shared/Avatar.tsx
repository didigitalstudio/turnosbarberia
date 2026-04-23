export function Avatar({
  name = 'TM', size = 36, hue = 55, dark = false
}: { name?: string; size?: number; hue?: number; dark?: boolean }) {
  return (
    <div
      style={{
        width: size, height: size,
        background: `oklch(0.85 0.04 ${hue})`,
        color: `oklch(0.28 0.06 ${hue})`,
        fontSize: size * 0.36,
        outline: dark ? '2px solid #161614' : '2px solid #FFFFFF'
      }}
      className="rounded-full grid place-items-center font-bold tracking-wide flex-shrink-0 select-none"
    >
      {name}
    </div>
  );
}
