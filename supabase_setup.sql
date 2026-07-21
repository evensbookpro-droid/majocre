-- Active l'extension UUID pour générer des IDs uniques
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CREATION DES TABLES DE LA BASE DE DONNÉES
-- ==========================================

-- Création de la table des profils utilisateurs
-- Note: l'ID correspond à auth.users.id; l'absence de contrainte directe évite les blocages de privilèges de schéma dans certaines consoles Supabase.
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des paramètres globaux de l'application (branding)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  site_name TEXT NOT NULL DEFAULT 'MAJOCRE',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#794cff',
  secondary_color TEXT NOT NULL DEFAULT '#064e3b',
  accent_color TEXT NOT NULL DEFAULT '#f59e0b',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des demandes de prêt
CREATE TABLE IF NOT EXISTS public.loan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  duration_months INTEGER NOT NULL,
  repayment_method TEXT NOT NULL,
  monthly_income NUMERIC(15, 2),
  dependents INTEGER,
  id_document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des sessions de transfert express de fonds (avec jauge de progression)
CREATE TABLE IF NOT EXISTS public.transfer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  recipient_name TEXT NOT NULL,
  iban TEXT,
  motif TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des transactions bancaires (historique)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  type TEXT NOT NULL, -- 'debit', 'credit', 'debit_repayment'
  recipient_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table de messagerie de support client (chat direct admin-user)
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des remboursements de prêt soumis
CREATE TABLE IF NOT EXISTS public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loan_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  external_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des codes de déblocage (OTP / Codes Admin)
CREATE TABLE IF NOT EXISTS public.admin_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des notifications utilisateurs
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('loan_request', 'loan_approved', 'loan_rejected', 'repayment_done', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ==========================================
-- 2. SECURITÉ ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Activer RLS pour toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 2.5 FONCTIONS D'AIDE SÉCURITÉ (RLS HELPERS)
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ==========================================
-- 3. POLITIQUES DE SÉCURITÉ (RLS POLICIES)
-- ==========================================

-- --- Table: users ---
DROP POLICY IF EXISTS "Lecture de son propre profil" ON public.users;
DROP POLICY IF EXISTS "Lecture par un admin" ON public.users;
DROP POLICY IF EXISTS "Lecture de son propre profil et admin" ON public.users;

CREATE POLICY "Lecture de son propre profil et admin" ON public.users 
FOR SELECT TO authenticated 
USING (auth.uid() = id OR public.is_admin_or_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Modification par soi-même" ON public.users;
DROP POLICY IF EXISTS "Modification par l'admin" ON public.users;
DROP POLICY IF EXISTS "Modification par soi-même ou admin" ON public.users;

CREATE POLICY "Modification par soi-même ou admin" ON public.users 
FOR UPDATE TO authenticated 
USING (auth.uid() = id OR public.is_admin_or_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Suppression par l'admin" ON public.users;
DROP POLICY IF EXISTS "Suppression par admin ou superadmin" ON public.users;

CREATE POLICY "Suppression par admin ou superadmin" ON public.users 
FOR DELETE TO authenticated 
USING (public.is_admin_or_superadmin(auth.uid()));

-- --- Table: app_settings ---
DROP POLICY IF EXISTS "Lecture publique pour tous" ON public.app_settings;
CREATE POLICY "Lecture publique pour tous" ON public.app_settings 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modification réservée au superadmin" ON public.app_settings;
CREATE POLICY "Modification réservée au superadmin" ON public.app_settings 
FOR ALL TO authenticated
USING (public.is_superadmin(auth.uid()));

-- --- Table: loan_requests ---
DROP POLICY IF EXISTS "Lecture demandes persos et admin" ON public.loan_requests;
CREATE POLICY "Lecture demandes persos et admin" ON public.loan_requests 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Création par l'utilisateur" ON public.loan_requests;
CREATE POLICY "Création par l'utilisateur" ON public.loan_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Modification par l'admin" ON public.loan_requests;
CREATE POLICY "Modification par l'admin" ON public.loan_requests 
FOR UPDATE TO authenticated 
USING (public.is_admin_or_superadmin(auth.uid()));

-- --- Table: transfer_sessions ---
DROP POLICY IF EXISTS "Lecture transferts persos et admin" ON public.transfer_sessions;
CREATE POLICY "Lecture transferts persos et admin" ON public.transfer_sessions 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Création transfert par l'utilisateur" ON public.transfer_sessions;
CREATE POLICY "Création transfert par l'utilisateur" ON public.transfer_sessions 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mise à jour transfert par l'utilisateur ou admin" ON public.transfer_sessions;
CREATE POLICY "Mise à jour transfert par l'utilisateur ou admin" ON public.transfer_sessions 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Suppression transfert par l'utilisateur ou admin" ON public.transfer_sessions;
CREATE POLICY "Suppression transfert par l'utilisateur ou admin" ON public.transfer_sessions 
FOR DELETE TO authenticated 
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

-- --- Table: transactions ---
DROP POLICY IF EXISTS "Lecture transactions persos et admin" ON public.transactions;
CREATE POLICY "Lecture transactions persos et admin" ON public.transactions 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

-- --- Table: support_messages ---
DROP POLICY IF EXISTS "Lecture support perso et admin" ON public.support_messages;
CREATE POLICY "Lecture support perso et admin" ON public.support_messages 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Création message de support" ON public.support_messages;
CREATE POLICY "Création message de support" ON public.support_messages 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- --- Table: loan_repayments ---
DROP POLICY IF EXISTS "Lecture paiements persos et admin" ON public.loan_repayments;
CREATE POLICY "Lecture paiements persos et admin" ON public.loan_repayments 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Création paiement par l'utilisateur" ON public.loan_repayments;
CREATE POLICY "Création paiement par l'utilisateur" ON public.loan_repayments 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Validation par l'admin" ON public.loan_repayments;
CREATE POLICY "Validation par l'admin" ON public.loan_repayments 
FOR UPDATE TO authenticated 
USING (public.is_admin_or_superadmin(auth.uid()));

-- --- Table: admin_codes ---
DROP POLICY IF EXISTS "Accès réservé aux administrateurs" ON public.admin_codes;
CREATE POLICY "Accès réservé aux administrateurs" ON public.admin_codes 
FOR ALL TO authenticated 
USING (public.is_admin_or_superadmin(auth.uid()));

-- --- Table: notifications ---
DROP POLICY IF EXISTS "Les utilisateurs voient leurs propres notifications" ON public.notifications;
CREATE POLICY "Les utilisateurs voient leurs propres notifications" ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insertion de notifications" ON public.notifications;
CREATE POLICY "Insertion de notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Mise à jour notifications" ON public.notifications;
CREATE POLICY "Mise à jour notifications" ON public.notifications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);


-- ==========================================
-- 4. BUCKETS DE STOCKAGE & POLITIQUES
-- ==========================================

-- Politiques pour les objets de stockage (storage.objects)
-- Note : Les buckets 'branding' et 'documents' doivent être configurés publiquement dans l'interface Supabase Storage.

DROP POLICY IF EXISTS "Logo public" ON storage.objects;
CREATE POLICY "Logo public" ON storage.objects 
FOR SELECT USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Upload logo superadmin" ON storage.objects;
CREATE POLICY "Upload logo superadmin" ON storage.objects 
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding' AND public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Update logo superadmin" ON storage.objects;
CREATE POLICY "Update logo superadmin" ON storage.objects 
FOR UPDATE TO authenticated
USING (bucket_id = 'branding' AND public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Lecture des documents par auth" ON storage.objects;
CREATE POLICY "Lecture des documents par auth" ON storage.objects 
FOR SELECT TO authenticated 
USING (
  bucket_id = 'documents' AND (
    auth.uid()::text = split_part(name, '/', 1)
    OR public.is_admin_or_superadmin(auth.uid())
  )
);

DROP POLICY IF EXISTS "Upload des documents par auth" ON storage.objects;
CREATE POLICY "Upload des documents par auth" ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents');


-- ==========================================
-- 5. FONCTIONS DE SYNCHRONISATION AUTH -> PROFILE
-- ==========================================

-- Synchronise les nouveaux comptes Supabase Auth directement vers public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user', -- rôle de départ par défaut
    0.00    -- solde au départ
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assure que le trigger n'existe pas en double
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Enregistre le trigger de synchronisation automatique
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 6. FONCTIONS ET ACTIONS METIER (RPC)
-- ==========================================

-- RPC : Valider et consommer un code secret OTP
CREATE OR REPLACE FUNCTION public.validate_admin_code(input_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_code_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_codes
    WHERE code = input_code AND is_used = false
  ) INTO v_code_exists;

  IF v_code_exists THEN
    UPDATE public.admin_codes
    SET is_used = true
    WHERE code = input_code;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC : Finaliser un virement express de fonds
CREATE OR REPLACE FUNCTION public.process_completed_transfer(transfer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC(15, 2);
  v_recipient_name TEXT;
  v_status TEXT;
BEGIN
  SELECT user_id, amount, recipient_name, status
  INTO v_user_id, v_amount, v_recipient_name, v_status
  FROM public.transfer_sessions
  WHERE id = transfer_id;

  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'Le transfert doit déjà être résolu en statut complété';
  END IF;

  UPDATE public.users
  SET balance = balance - v_amount
  WHERE id = v_user_id;

  INSERT INTO public.transactions (user_id, amount, type, recipient_name)
  VALUES (v_user_id, v_amount, 'debit', v_recipient_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC : Forcer l'avancement d'un transfert bancaire (Admin)
CREATE OR REPLACE FUNCTION public.force_transfer_progress(transfer_id UUID, new_progress INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.transfer_sessions
  SET progress = new_progress
  WHERE id = transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC : Approuver une demande de prêt (Admin)
CREATE OR REPLACE FUNCTION public.approve_loan(p_loan_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC(15,2);
BEGIN
  SELECT user_id, amount
  INTO v_user_id, v_amount
  FROM public.loan_requests
  WHERE id = p_loan_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande de prêt invalide, inexistante ou déjà résolue';
  END IF;

  UPDATE public.loan_requests
  SET status = 'approved'
  WHERE id = p_loan_id;

  UPDATE public.users
  SET balance = balance + v_amount
  WHERE id = v_user_id;

  INSERT INTO public.transactions (user_id, amount, type, recipient_name)
  VALUES (v_user_id, v_amount, 'credit', 'Obtention Crédit / Prêt');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC : Rejeter une demande de prêt (Admin)
CREATE OR REPLACE FUNCTION public.reject_loan(loan_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.loan_requests
  SET status = 'rejected'
  WHERE id = loan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC : Supprimer un utilisateur de manière sécurisée (par un admin/superadmin)
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Vérifier que l'utilisateur qui exécute la fonction est bien un admin ou superadmin
  IF NOT public.is_admin_or_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Non autorisé : Seuls les administrateurs peuvent supprimer des comptes.';
  END IF;

  -- 2. Empêcher la suppression de son propre compte
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé : Vous ne pouvez pas supprimer votre propre compte.';
  END IF;

  -- 3. Supprimer de auth.users (la table d'authentification Supabase)
  DELETE FROM auth.users WHERE id = target_user_id;

  -- 4. Supprimer de public.users
  DELETE FROM public.users WHERE id = target_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- RPC : Générer un nouveau code d'administration OTP
CREATE OR REPLACE FUNCTION public.generate_admin_code()
RETURNS TEXT AS $$
DECLARE
  v_new_code TEXT;
BEGIN
  v_new_code := lpad(floor(random() * 1000000)::text, 6, '0');
  
  INSERT INTO public.admin_codes (code)
  VALUES (v_new_code);

  RETURN v_new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC : Générer les statistiques pour le tableau de bord Admin
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON AS $$
DECLARE
  res JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM public.users),
    'total_balance', COALESCE((SELECT sum(balance) FROM public.users), 0),
    'total_transfers', (SELECT count(*) FROM public.transfer_sessions),
    'total_transactions', (SELECT count(*) FROM public.transactions)
  ) INTO res;
  
  RETURN res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC : Valider et confirmer le remboursement d'un prêt (Admin)
CREATE OR REPLACE FUNCTION public.validate_repayment(repayment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC(15,2);
  v_loan_id UUID;
BEGIN
  SELECT user_id, amount, loan_id
  INTO v_user_id, v_amount, v_loan_id
  FROM public.loan_repayments
  WHERE id = repayment_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opération de remboursement introuvable ou déjà validée';
  END IF;

  UPDATE public.loan_repayments
  SET status = 'confirmed'
  WHERE id = repayment_id;

  UPDATE public.users
  SET balance = balance - v_amount
  WHERE id = v_user_id;

  INSERT INTO public.transactions (user_id, amount, type, recipient_name)
  VALUES (v_user_id, v_amount, 'debit_repayment', 'Validation remboursement prêt');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC : Initier et soumettre une opération de remboursement par l'utilisateur
CREATE OR REPLACE FUNCTION public.repay_loan(
  p_loan_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_external_ref TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.loan_repayments (loan_id, user_id, amount, payment_method, external_reference, status)
  VALUES (p_loan_id, p_user_id, p_amount, p_method, p_external_ref, 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC : Forcer la mise à jour manuelle du solde d'un compte (Admin/Suivi de solde)
CREATE OR REPLACE FUNCTION public.update_user_balance(target_user_id UUID, new_balance NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET balance = new_balance
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 7. TRIGGERS POUR NOTIFICATIONS AUTOMATIQUES
-- ==========================================

-- Trigger : Notifier d'une nouvelle demande de prêt
CREATE OR REPLACE FUNCTION public.notify_on_loan_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT id, 'Nouvelle demande de prêt', 'Une nouvelle demande de prêt de ' || NEW.amount || '€ a été soumise.', 'loan_request'
  FROM public.users
  WHERE role IN ('admin', 'superadmin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_on_loan_request ON public.loan_requests;
CREATE TRIGGER tr_notify_on_loan_request
  AFTER INSERT ON public.loan_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_loan_request();

-- Trigger : Notifier de la mise à jour du statut d'une demande de prêt
CREATE OR REPLACE FUNCTION public.notify_on_loan_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status <> NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.user_id, 'Prêt Approuvé', 'Félicitations, votre demande de prêt de ' || NEW.amount || '€ a été approuvée.', 'loan_approved');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.user_id, 'Prêt Refusé', 'Désolé, votre demande de prêt de ' || NEW.amount || '€ a été refusée.', 'loan_rejected');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_on_loan_status_change ON public.loan_requests;
CREATE TRIGGER tr_notify_on_loan_status_change
  AFTER UPDATE ON public.loan_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_loan_status_change();

-- Trigger : Notifier d'un nouveau remboursement effectué
CREATE OR REPLACE FUNCTION public.notify_on_repayment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.user_id, 'Remboursement Effectué', 'Votre remboursement de ' || NEW.amount || '€ a bien été enregistré et est en attente de validation.', 'repayment_done');
  
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT id, 'Nouveau Remboursement', 'Un nouveau remboursement de ' || NEW.amount || '€ a été soumis pour validation.', 'repayment_done'
  FROM public.users
  WHERE role IN ('admin', 'superadmin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_on_repayment ON public.loan_repayments;
CREATE TRIGGER tr_notify_on_repayment
  AFTER INSERT ON public.loan_repayments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_repayment();


-- ==========================================
-- 8. INITIALISATION DES DONNÉES PAR DÉFAUT
-- ==========================================

-- Insère les configurations de branding par défaut de l'application si absente
INSERT INTO public.app_settings (site_name, primary_color, secondary_color, accent_color)
VALUES ('MAJOCRE', '#794cff', '#064e3b', '#f59e0b')
ON CONFLICT DO NOTHING;


-- ==========================================
-- 9. CONFIGURATION DU REALTIME SUPABASE
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- --- Migration : mise à jour de la contrainte check de transfer_sessions ---
DO $$
BEGIN
  -- Tenter de supprimer la contrainte existante si elle existe
  ALTER TABLE public.transfer_sessions DROP CONSTRAINT IF EXISTS transfer_sessions_status_check;
  -- Recréer la contrainte pour accepter 'rejected'
  ALTER TABLE public.transfer_sessions ADD CONSTRAINT transfer_sessions_status_check CHECK (status IN ('pending', 'completed', 'rejected'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- --- Migration : ajout des colonnes de contact et banque à app_settings ---
DO $$
BEGIN
  ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT 'contact@premium-saas.com';
  ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT '+33 1 23 45 67 89';
  ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS bank_info TEXT DEFAULT 'FR76 3000 4000 1234 5678 9012 345';
  ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS footer_text TEXT DEFAULT '© Tous droits réservés. Plateforme de services financiers.';
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- --- Migration : ajout des colonnes iban et motif à transfer_sessions ---
DO $$
BEGIN
  ALTER TABLE public.transfer_sessions ADD COLUMN IF NOT EXISTS iban TEXT;
  ALTER TABLE public.transfer_sessions ADD COLUMN IF NOT EXISTS motif TEXT;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- --- Migration : création des tables banks et iban_cache pour le système IBAN ---
CREATE TABLE IF NOT EXISTS public.banks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  country_code TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bic TEXT,
  city TEXT,
  postal_code TEXT,
  address TEXT,
  website TEXT,
  phone TEXT,
  sepa_supported BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT banks_country_bank_code_unique UNIQUE (country_code, bank_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS banks_country_bank_code_idx ON public.banks (country_code, bank_code);

-- --- Migration : s'assurer de la contrainte UNIQUE sur (country_code, bank_code) pour les upserts ---
DO $$
BEGIN
  -- 1. Éliminer les éventuels doublons pour pouvoir poser la contrainte unique sans erreur
  DELETE FROM public.banks a USING public.banks b 
  WHERE a.id > b.id 
    AND a.country_code = b.country_code 
    AND a.bank_code = b.bank_code;

  -- 2. S'assurer que l'index existant est UNIQUE
  DROP INDEX IF EXISTS public.banks_country_bank_code_idx;
  CREATE UNIQUE INDEX IF NOT EXISTS banks_country_bank_code_idx ON public.banks (country_code, bank_code);

  -- 3. Ajouter la contrainte unique si elle n'existe pas déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'banks_country_bank_code_unique'
  ) THEN
    ALTER TABLE public.banks ADD CONSTRAINT banks_country_bank_code_unique UNIQUE (country_code, bank_code);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.iban_cache (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  iban TEXT NOT NULL,
  country TEXT NOT NULL,
  bank_code TEXT,
  bank_name TEXT,
  bic TEXT,
  city TEXT,
  sepa BOOLEAN DEFAULT true,
  cached_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS iban_cache_iban_idx ON public.iban_cache (iban);

-- Row Level Security (RLS)
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iban_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture pour tous les authentifies" ON public.banks;
CREATE POLICY "Lecture pour tous les authentifies" ON public.banks 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Modifications reservees au superadmin" ON public.banks;
CREATE POLICY "Modifications reservees au superadmin" ON public.banks 
  FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Lecture cache pour tous les authentifies" ON public.iban_cache;
CREATE POLICY "Lecture cache pour tous les authentifies" ON public.iban_cache 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insertion cache pour tous les authentifies" ON public.iban_cache;
CREATE POLICY "Insertion cache pour tous les authentifies" ON public.iban_cache 
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Mise a jour cache pour tous les authentifies" ON public.iban_cache;
CREATE POLICY "Mise a jour cache pour tous les authentifies" ON public.iban_cache 
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Suppression cache pour superadmin" ON public.iban_cache;
CREATE POLICY "Suppression cache pour superadmin" ON public.iban_cache 
  FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));

-- --- Migration : ajout de la colonne blocking_thresholds et theme à app_settings et users ---
DO $$
BEGIN
  ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS blocking_thresholds TEXT DEFAULT '89,99';
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocking_thresholds TEXT DEFAULT NULL;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;


