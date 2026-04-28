import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Endpoint de auto-login para compartir con prospects.
// Recibe ?role=dueno|cliente&t=<LOGIN_AS_TOKEN>.
//
// Si el token coincide con la env var, asegura que el user demo exista en
// Supabase, le asigna un password random nuevo, hace signInWithPassword (que
// setea las cookies de sesión) y redirige al panel correspondiente.
//
// Sin LOGIN_AS_TOKEN configurado, devuelve 503: el endpoint queda inerte.

type Role = 'dueno' | 'cliente';

const ACCOUNTS: Record<Role, { email: string; name: string; phone: string; isAdmin: boolean }> = {
  dueno: {
    email: process.env.LOGIN_AS_OWNER_EMAIL || 'dueno.demo@turnosbarberia.app',
    name: 'Tomás · Dueño',
    phone: '+54 9 11 5500 1100',
    isAdmin: true
  },
  cliente: {
    email: process.env.LOGIN_AS_CLIENT_EMAIL || 'cliente.demo@turnosbarberia.app',
    name: 'Joaquín Méndez',
    phone: '+54 9 11 5823 4412',
    isAdmin: false
  }
};

const SHOP_SLUG = process.env.LOGIN_AS_SHOP_SLUG || 'barberia-demo';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const role = (url.searchParams.get('role') || '') as Role;
  const token = url.searchParams.get('t') || url.searchParams.get('token') || '';

  const expected = process.env.LOGIN_AS_TOKEN || '';
  if (!expected) {
    return NextResponse.json({ error: 'login-as no configurado' }, { status: 503 });
  }
  if (token !== expected) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }
  if (role !== 'dueno' && role !== 'cliente') {
    return NextResponse.json(
      { error: "rol inválido — usá ?role=dueno o ?role=cliente" },
      { status: 400 }
    );
  }

  const account = ACCOUNTS[role];
  const admin = createAdminClient();

  const { data: shop } = await admin
    .from('shops')
    .select('id, slug')
    .eq('slug', SHOP_SLUG)
    .maybeSingle<{ id: string; slug: string }>();
  if (!shop) {
    return NextResponse.json(
      { error: `shop "${SHOP_SLUG}" no existe — creala primero` },
      { status: 500 }
    );
  }

  const sessionPassword = randomBytes(18).toString('base64url');

  let userId: string;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u: any) => u.email === account.email);
  if (existing) {
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, {
      password: sessionPassword,
      email_confirm: true
    });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: sessionPassword,
      email_confirm: true,
      user_metadata: { name: account.name, phone: account.phone }
    });
    if (error || !data.user) {
      return NextResponse.json(
        { error: 'no se pudo crear el user: ' + (error?.message || 'desconocido') },
        { status: 500 }
      );
    }
    userId = data.user.id;
  }

  await admin.from('profiles').upsert({
    id: userId,
    name: account.name,
    email: account.email,
    phone: account.phone,
    is_admin: account.isAdmin,
    shop_id: shop.id
  });

  const supabase = createClient();
  const { error: signinErr } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: sessionPassword
  });
  if (signinErr) {
    return NextResponse.json(
      { error: 'signin falló: ' + signinErr.message },
      { status: 500 }
    );
  }

  const dest = role === 'dueno' ? '/shop' : `/${shop.slug}`;
  return NextResponse.redirect(new URL(dest, req.url));
}
