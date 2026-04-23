import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'El Estudio · BarberShop',
  description: 'Reservá tu turno en segundos. Sin llamadas, sin esperas.',
  applicationName: 'El Estudio',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'El Estudio' }
};

export const viewport: Viewport = {
  themeColor: '#0E0E0E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>
        <div className="mx-auto min-h-screen max-w-[440px] bg-bg">
          {children}
        </div>
      </body>
    </html>
  );
}
