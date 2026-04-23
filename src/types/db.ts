export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type SaleType = 'service' | 'product';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'debito' | 'credito';

export type Shop = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  owner_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type Service = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  duration_mins: number;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type Barber = {
  id: string;
  shop_id: string;
  name: string;
  slug: string;
  role: string | null;
  initials: string;
  hue: number;
  bio: string | null;
  is_active: boolean;
  rating: number;
  created_at: string;
};

export type Schedule = {
  id: string;
  shop_id: string;
  barber_id: string;
  day_of_week: number; // 0=Dom, 1=Lun ... 6=Sab
  start_time: string; // 'HH:MM'
  end_time: string;
  is_working: boolean;
};

export type Profile = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_admin: boolean;
  shop_id: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
  shop_id: string;
  profile_id: string | null;
  barber_id: string;
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  starts_at: string; // ISO timestamp
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  created_at: string;
};

export type Sale = {
  id: string;
  shop_id: string;
  type: SaleType;
  appointment_id: string | null;
  product_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  customer_name: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      shops: { Row: Shop; Insert: Partial<Shop>; Update: Partial<Shop> };
      services: { Row: Service; Insert: Partial<Service>; Update: Partial<Service> };
      barbers: { Row: Barber; Insert: Partial<Barber>; Update: Partial<Barber> };
      schedules: { Row: Schedule; Insert: Partial<Schedule>; Update: Partial<Schedule> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      appointments: { Row: Appointment; Insert: Partial<Appointment>; Update: Partial<Appointment> };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      sales: { Row: Sale; Insert: Partial<Sale>; Update: Partial<Sale> };
    };
  };
};
