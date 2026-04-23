# 💈 El Estudio · BarberShop

Webapp de turnos para barbería · Next.js 14 + Supabase + Vercel.

Mobile-first (390×844). Dos vistas:
- **Cliente** (`/`, `/reservar`, `/mis-turnos`, `/perfil`) — login con magic link, reserva en 3 pasos.
- **Shop** (`/shop`, `/shop/caja`, `/shop/equipo`) — agenda del día, caja del día, equipo y ocupación. Solo accesible para usuarios con `is_admin = true`.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres + Auth (magic link) + RLS + Realtime
- Deploy: Vercel

---

## Setup local

```bash
npm install
cp .env.example .env.local
# Editar .env.local con tus claves de Supabase
npm run dev
```

Abrí http://localhost:3000

## Variables de entorno

| Variable | Dónde sacarla |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase → Project Settings → API → "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase → Project Settings → API → "anon public" |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase → Project Settings → API → "service_role" (¡nunca commitear!) |
| `NEXT_PUBLIC_SITE_URL`            | URL pública del sitio (en local: `http://localhost:3000`; en prod: tu dominio Vercel) |

---

## Aplicar el schema a Supabase (una vez)

**Opción A — Pegar en el SQL Editor del dashboard (más rápido):**
1. Abrí https://supabase.com/dashboard/project/wrbyzqwfysdliiesbdab/sql/new
2. Pegá el contenido de [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) y "Run".
3. Pegá el contenido de [`supabase/seed.sql`](./supabase/seed.sql) y "Run".

**Opción B — Programáticamente con psql/Node:**
```bash
npm install pg --no-save
node scripts/apply-schema.mjs "postgresql://postgres:TU_PASS@db.wrbyzqwfysdliiesbdab.supabase.co:5432/postgres"
```
(El password lo encontrás en Supabase → Settings → Database → "Database password".)

## Configurar Auth en Supabase

1. **Site URL**: Supabase → Authentication → URL Configuration → poné tu URL de Vercel (ej: `https://elestudio.vercel.app`).
2. **Redirect URLs**: agregar `https://tu-dominio.vercel.app/auth/callback` y `http://localhost:3000/auth/callback`.
3. **Email templates** (opcional): customizar el "Magic Link" desde Authentication → Email Templates.

## Hacer admin a un usuario

Una vez que un usuario hizo login al menos una vez:
```sql
update public.profiles set is_admin = true where email = 'tu@email.com';
```
Luego va a `/shop` y tiene acceso al panel.

---

## Deploy a Vercel

```bash
# Vía CLI:
npx vercel --prod
# Y cargar las 4 env vars en Vercel Dashboard → Project → Settings → Environment Variables.
```

O directo desde el dashboard de Vercel: "Import Git Repository" → seleccionar este repo → cargar las env vars → Deploy.

---

## Estructura

```
src/
├── app/
│   ├── layout.tsx                 # Root, fuentes, container mobile
│   ├── globals.css                # Tokens + barber-pole stripe
│   ├── page.tsx                   # Home cliente
│   ├── login/                     # Login (magic link)
│   ├── reservar/                  # Flujo de reserva (3 pasos)
│   ├── confirmacion/[id]/         # Ticket post-reserva
│   ├── mis-turnos/                # Próximos + historial
│   ├── perfil/
│   ├── shop/                      # Panel admin (RLS gate en layout)
│   │   ├── page.tsx               # Agenda del día
│   │   ├── caja/                  # Caja del día
│   │   ├── equipo/                # Equipo + ocupación
│   │   └── ajustes/
│   ├── api/availability/route.ts  # Slots disponibles
│   ├── auth/callback/route.ts     # OAuth/magic link callback
│   └── actions/                   # Server actions (auth, booking)
├── components/
│   ├── shared/                    # Icon, Avatar, Pill, Stripe
│   ├── client/                    # Pantallas cliente
│   └── shop/                      # Pantallas shop
├── lib/
│   ├── supabase/                  # browser/server/middleware
│   ├── availability.ts            # Lógica de slots
│   └── format.ts                  # money(), fechas AR
├── types/db.ts                    # Tipos del esquema
└── middleware.ts                  # Refresh de sesión Supabase

supabase/
├── migrations/0001_init.sql       # Schema + RLS + indices + realtime
└── seed.sql                       # Barberos, servicios, horarios, productos
```

## Scripts

```bash
npm run dev         # Dev server con HMR
npm run build       # Build de producción
npm run start       # Servir build local
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

---

## Próximos pasos / TODO

- Emails de confirmación (Resend)
- Realtime: suscribirse a `appointments` en `/shop` para refrescar agenda en vivo
- Modal de "Cobrar servicio" / "Vender producto" en `/shop/caja`
- Editor de horarios y barberos en `/shop/ajustes`
- WhatsApp recordatorio 24hs antes
