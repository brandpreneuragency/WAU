-- Supabase Schema for Uniform Management Application
-- This script is IDEMPOTENT (can be run multiple times safely)

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'tenant_admin')),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  position TEXT,
  height_cm NUMERIC,
  chest_cm NUMERIC,
  waist_cm NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  size TEXT,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  min_threshold INTEGER DEFAULT 10,
  unit_price NUMERIC DEFAULT 0,
  sku TEXT,
  fabric TEXT,
  care TEXT,
  color TEXT,
  description TEXT,
  image_url TEXT,
  department TEXT,
  position TEXT,
  chest_cm NUMERIC,
  shoulder_cm NUMERIC,
  waist_cm NUMERIC,
  hip_cm NUMERIC,
  height_cm NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  total_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 3. Utility Functions for RLS
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 4. RLS Policies (Drop first to allow re-running)

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT USING (public.get_auth_role() = 'super_admin');
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admins can update all profiles" ON public.profiles FOR UPDATE USING (public.get_auth_role() = 'super_admin');
CREATE POLICY "Super admins can delete profiles" ON public.profiles FOR DELETE USING (public.get_auth_role() = 'super_admin');
CREATE POLICY "Super admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.get_auth_role() = 'super_admin');

-- Tenants
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenant admins can view their own tenant" ON public.tenants;
CREATE POLICY "Super admins can manage all tenants" ON public.tenants FOR ALL USING (public.get_auth_role() = 'super_admin');
CREATE POLICY "Tenant admins can view their own tenant" ON public.tenants FOR SELECT USING (id = public.get_auth_tenant_id());

-- Staff
DROP POLICY IF EXISTS "Super admins can manage all staff" ON public.staff;
DROP POLICY IF EXISTS "Tenant admins can manage their own staff" ON public.staff;
CREATE POLICY "Super admins can manage all staff" ON public.staff FOR ALL USING (public.get_auth_role() = 'super_admin');
CREATE POLICY "Tenant admins can manage their own staff" ON public.staff FOR ALL USING (tenant_id = public.get_auth_tenant_id());

-- Inventory
DROP POLICY IF EXISTS "Super admins can manage all inventory" ON public.inventory;
DROP POLICY IF EXISTS "Tenant admins can manage their own inventory" ON public.inventory;
CREATE POLICY "Super admins can manage all inventory" ON public.inventory FOR ALL USING (public.get_auth_role() = 'super_admin');
CREATE POLICY "Tenant admins can manage their own inventory" ON public.inventory FOR ALL USING (tenant_id = public.get_auth_tenant_id());

-- Assignments
DROP POLICY IF EXISTS "Super admins can manage all assignments" ON public.assignments;
DROP POLICY IF EXISTS "Tenant admins can manage their own assignments" ON public.assignments;
CREATE POLICY "Super admins can manage all assignments" ON public.assignments FOR ALL USING (public.get_auth_role() = 'super_admin');
CREATE POLICY "Tenant admins can manage their own assignments" ON public.assignments FOR ALL USING (tenant_id = public.get_auth_tenant_id());

-- Orders
DROP POLICY IF EXISTS "Super admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Tenant admins can manage their own orders" ON public.orders;
CREATE POLICY "Super admins can manage all orders" ON public.orders FOR ALL USING (public.get_auth_role() = 'super_admin');
CREATE POLICY "Tenant admins can manage their own orders" ON public.orders FOR ALL USING (tenant_id = public.get_auth_tenant_id());

-- Order Items
DROP POLICY IF EXISTS "Super admins can manage all order items" ON public.order_items;
DROP POLICY IF EXISTS "Tenant admins can manage their own order items" ON public.order_items;
CREATE POLICY "Super admins can manage all order items" ON public.order_items FOR ALL USING (public.get_auth_role() = 'super_admin');
CREATE POLICY "Tenant admins can manage their own order items" ON public.order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.tenant_id = public.get_auth_tenant_id())
);

-- 5. Authentication Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, tenant_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'tenant_admin'), (NEW.raw_user_meta_data->>'tenant_id')::UUID);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
