'use client';
import { useFormStatus } from 'react-dom';
import { Icon } from '@/components/shared/Icon';

// Usado dentro de un <form action={serverAction}>. useFormStatus detecta
// el pending correctamente, y el form-action redirect de Next.js se
// maneja por el runtime (sin dejar transitions colgadas como pasaba con
// useTransition + await).

type IconName = 'user' | 'settings';

export function DemoSubmitButton({
  label,
  iconName,
  variant
}: {
  label: string;
  iconName: IconName;
  variant: 'light' | 'dark';
}) {
  const { pending } = useFormStatus();
  const base =
    'rounded-xl px-3 py-3 text-[13px] font-semibold flex flex-col items-center gap-1 disabled:opacity-50 active:scale-[0.98] transition w-full';
  const cls =
    variant === 'light'
      ? `${base} bg-bg text-ink`
      : `${base} text-white bg-accent`;
  return (
    <button type="submit" disabled={pending} className={cls}>
      <Icon name={iconName} size={18} color={variant === 'light' ? undefined : '#fff'} />
      <span>{pending ? 'Entrando…' : label}</span>
    </button>
  );
}
