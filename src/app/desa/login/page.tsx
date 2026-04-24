import { redirect } from 'next/navigation';
import { SuperAdminLoginForm } from '@/components/admin/SuperAdminLoginForm';
import { isSuperAdmin } from '@/lib/super-admin-auth';

export const dynamic = 'force-dynamic';

export default function SuperAdminLoginPage() {
  if (isSuperAdmin()) redirect('/desa');
  return <SuperAdminLoginForm />;
}
