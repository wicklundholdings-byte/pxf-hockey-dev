
-- Add missing column to drills
ALTER TABLE public.drills ADD COLUMN IF NOT EXISTS diagram_url text;

-- Enums
DO $$ BEGIN CREATE TYPE public.camp_format AS ENUM ('camp','session'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.camp_status AS ENUM ('draft','live','ended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.location_type AS ENUM ('venue','online','tba'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_plan AS ENUM ('none','two','three'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.registration_status AS ENUM ('paid','abandoned','waitlisted','refunded','pending'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.order_status AS ENUM ('pending','paid','refunded','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.team_member_status AS ENUM ('active','invited'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.conversation_type AS ENUM ('camp_group','dm'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.email_campaign_status AS ENUM ('draft','scheduled','sent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.waitlist_status AS ENUM ('waiting','offered','claimed','expired','released'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

--------------------------------------------------------------------------------
-- CAMPS
--------------------------------------------------------------------------------
CREATE TABLE public.camps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  format public.camp_format NOT NULL DEFAULT 'camp',
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  hero_image text,
  tags text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  location_type public.location_type NOT NULL DEFAULT 'tba',
  venue_name text,
  address text,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  timezone text NOT NULL DEFAULT 'America/New_York',
  price_cents integer NOT NULL DEFAULT 0,
  capacity integer NOT NULL DEFAULT 0,
  show_remaining boolean NOT NULL DEFAULT true,
  early_bird_price_cents integer,
  early_bird_expires_at timestamptz,
  sibling_discount boolean NOT NULL DEFAULT false,
  payment_plan public.payment_plan NOT NULL DEFAULT 'none',
  waiver_url text,
  status public.camp_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camps TO authenticated;
GRANT SELECT ON public.camps TO anon;
GRANT ALL ON public.camps TO service_role;
ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view live camps" ON public.camps FOR SELECT TO anon, authenticated USING (status = 'live');
CREATE POLICY "Owners manage their camps" ON public.camps FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_camps_updated BEFORE UPDATE ON public.camps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_camps_owner ON public.camps(owner_id);
CREATE INDEX idx_camps_status ON public.camps(status);

--------------------------------------------------------------------------------
CREATE TABLE public.camp_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  label text NOT NULL,
  field_type text NOT NULL,
  options text[] NOT NULL DEFAULT '{}',
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_custom_fields TO authenticated;
GRANT SELECT ON public.camp_custom_fields TO anon;
GRANT ALL ON public.camp_custom_fields TO service_role;
ALTER TABLE public.camp_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View custom fields for live camps" ON public.camp_custom_fields FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND c.status = 'live'));
CREATE POLICY "Owners manage custom fields" ON public.camp_custom_fields FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

--------------------------------------------------------------------------------
CREATE TABLE public.camp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  start_time time,
  end_time time,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_sessions TO authenticated;
GRANT ALL ON public.camp_sessions TO service_role;
ALTER TABLE public.camp_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage sessions" ON public.camp_sessions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

--------------------------------------------------------------------------------
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  subscribed boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage contacts" ON public.contacts FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_contacts_owner ON public.contacts(owner_id);

--------------------------------------------------------------------------------
CREATE TABLE public.attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  gender text,
  birthday date,
  position text,
  skill_level text,
  jersey_number text,
  handedness text,
  equipment_size text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendees TO authenticated;
GRANT ALL ON public.attendees TO service_role;
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage attendees" ON public.attendees FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_attendees_updated BEFORE UPDATE ON public.attendees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_attendees_owner ON public.attendees(owner_id);

--------------------------------------------------------------------------------
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  percent_off integer,
  amount_off_cents integer,
  expires_at timestamptz,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

--------------------------------------------------------------------------------
CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  attendee_id uuid REFERENCES public.attendees(id) ON DELETE SET NULL,
  status public.registration_status NOT NULL DEFAULT 'pending',
  amount_cents integer NOT NULL DEFAULT 0,
  order_number text NOT NULL UNIQUE DEFAULT ('PXF-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  custom_field_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage registrations" ON public.registrations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE TRIGGER trg_regs_updated BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_regs_camp ON public.registrations(camp_id);
CREATE INDEX idx_regs_status ON public.registrations(status);

--------------------------------------------------------------------------------
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  stripe_payment_intent text,
  total_cents integer NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  payment_plan_installments integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage orders" ON public.orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.registrations r JOIN public.camps c ON c.id = r.camp_id WHERE r.id = registration_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.registrations r JOIN public.camps c ON c.id = r.camp_id WHERE r.id = registration_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------------------------------------
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  period_start date,
  period_end date,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view payouts" ON public.payouts FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

--------------------------------------------------------------------------------
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Assistant Coach',
  status public.team_member_status NOT NULL DEFAULT 'invited',
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage team" ON public.team_members FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR member_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

--------------------------------------------------------------------------------
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.camp_sessions(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT false,
  marked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(registration_id, session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage attendance" ON public.attendance FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.registrations r JOIN public.camps c ON c.id = r.camp_id WHERE r.id = registration_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.registrations r JOIN public.camps c ON c.id = r.camp_id WHERE r.id = registration_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

--------------------------------------------------------------------------------
CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  skating smallint, puck_control smallint, passing smallint, shooting smallint, hockey_sense smallint, compete_level smallint,
  notes text,
  sent_to_parent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage evaluations" ON public.evaluations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.registrations r JOIN public.camps c ON c.id = r.camp_id WHERE r.id = registration_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.registrations r JOIN public.camps c ON c.id = r.camp_id WHERE r.id = registration_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE TRIGGER trg_eval_updated BEFORE UPDATE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------------------------------------
CREATE TABLE public.camp_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_media TO authenticated;
GRANT ALL ON public.camp_media TO service_role;
ALTER TABLE public.camp_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage camp media" ON public.camp_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

--------------------------------------------------------------------------------
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.conversation_type NOT NULL,
  camp_id uuid REFERENCES public.camps(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = _conv AND user_id = _user)
$$;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid,uuid) TO authenticated, service_role;

CREATE POLICY "Members view conversations" ON public.conversations FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_conversation_member(id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated create conversations" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Members view membership" ON public.conversation_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_conversation_member(conversation_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Conversation creator manages members" ON public.conversation_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()));

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  image_path text,
  pinned boolean NOT NULL DEFAULT false,
  read_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Members send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "Senders update own messages" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

--------------------------------------------------------------------------------
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  template text,
  subject text NOT NULL,
  body text NOT NULL,
  status public.email_campaign_status NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  open_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage campaigns" ON public.email_campaigns FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_camp_email_updated BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------------------------------------
CREATE TABLE public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  attendee_id uuid REFERENCES public.attendees(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  claim_expires_at timestamptz,
  status public.waitlist_status NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_entries TO authenticated;
GRANT ALL ON public.waitlist_entries TO service_role;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage waitlist" ON public.waitlist_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
