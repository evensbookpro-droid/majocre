# Guide de Migration Supabase 🚀

Ce guide vous explique étape par étape comment créer un nouveau projet Supabase et copier l'intégralité de votre base de données actuelle (schémas, tables, triggers, politiques RLS, clés d'administration et données utilisateur) de votre ancien projet vers le nouveau.

---

## Informations sur votre projet actuel :
* **ID du Projet actuel** : `zzasndslgzztichpiudv`
* **Hôte de la Base de Données actuelle** : `db.zzasndslgzztichpiudv.supabase.co`
* **Port** : `5432`

---

## Étape 1 : Créer votre nouveau projet Supabase

1. Connectez-vous à votre compte sur [Supabase.com](https://supabase.com).
2. Cliquez sur le bouton **New Project**.
3. Sélectionnez votre organisation, puis entrez les détails de votre nouveau projet :
   * **Name** : Choisissez le nom de votre choix (ex: `SaaS Premium New`).
   * **Database Password** : Définissez un mot de passe fort et **notez-le précieusement** (noté ci-dessous sous le nom `[VOTRE_NOUVEAU_MOT_DE_PASSE]`).
   * **Region** : Choisissez de préférence une région proche (ex: *Europe (Paris) - eu-west-3*).
4. Cliquez sur **Create new project** et attendez quelques minutes que la base de données soit configurée.

---

## Étape 2 : Copier l'intégralité de la base de données (Méthodes de migration)

Voici trois méthodes recommandées pour transférer votre base de données. 

* **La Méthode A** est idéale si vous souhaitez conserver l'intégralité des données en cours d'utilisation via votre propre terminal.
* **La Méthode C (Nouveau - Recommandé)** est de loin la plus simple : elle utilise le fichier `supabase_setup.sql` déjà présent dans votre projet pour recréer toute l'infrastructure (tables, clés d'administration, politiques, fonctions SQL complexes) directement depuis votre navigateur, sans aucun logiciel à installer !

---

### Méthode C : Directement en SQL depuis l'Éditeur Supabase (Le plus simple, sans Terminal ! 🌐)

Puisque nous disposons déjà du fichier complet de base de données **`supabase_setup.sql`** à la racine de ce projet, vous pouvez recréer toute l'architecture de votre application en quelques clics :

1. **Ouvrez le fichier `supabase_setup.sql`** dans l'éditeur de Google AI Studio pour afficher son code.
2. **Copiez l'intégralité** du code SQL de ce fichier.
3. Connectez-vous à votre **nouveau projet Supabase** sur [Supabase.com](https://supabase.com).
4. Dans le menu de gauche, cliquez sur **SQL Editor** (l'icône avec un symbole de terminal `>_`).
5. Cliquez sur **New query** (ou "Nouvelle requête") pour ouvrir un éditeur vide.
6. **Collez le code de votre `supabase_setup.sql`** dans cet éditeur.
7. Cliquez sur le bouton **Run** (en bas à droite de l'éditeur SQL).
8. **Félicitations !** Toutes vos tables, politiques RLS, triggers et fonctions personnalisées (comme la validation des codes d'administration et les prêts) se sont créés instantanément.

> 📝 **Pour transférer vos anciennes données (si vous le souhaitez) :**
> Si vous voulez copier des utilisateurs ou des lignes existantes sans terminal, vous pouvez simplement aller dans l'ancienne console Supabase, aller dans le **Table Editor**, cliquer sur **Export** > **Export to CSV**. Ensuite, allez dans la console de votre nouveau projet, cliquez sur la même table, puis sur **Import** > **Upload CSV** !

---

### Méthode A : Via votre terminal local (Optionnel - copie Schéma + Données globales)

Cette méthode utilise `pg_dump` et `psql` (fournis par PostgreSQL) pour exporter de l'ancien projet et réimporter dans le nouveau.

1. **Sauvegarder la base de données actuelle (Export)** :
   Ouvrez votre terminal ou invite de commande sur votre machine locale et exécutez la commande suivante :
   ```bash
   pg_dump "postgresql://postgres:[VOTRE_MOT_DE_PASSE_ACTUEL]@db.zzasndslgzztichpiudv.supabase.co:5432/postgres" --clean > backup_migration.sql
   ```
   *(Remplacez `[VOTRE_MOT_DE_PASSE_ACTUEL]` par le mot de passe de la base de données de votre projet d'origine).*

2. **Restaurer la base de données sur le nouveau projet (Import)** :
   Une fois le fichier `backup_migration.sql` généré, exécutez la commande suivante pour l'importer dans votre nouveau projet :
   ```bash
   psql "postgresql://postgres:[VOTRE_NOUVEAU_MOT_DE_PASSE]@db.[VOTRE_NOUVEL_ID_PROJET].supabase.co:5432/postgres" -f backup_migration.sql
   ```
   *(Remplacez `[VOTRE_NOUVEAU_MOT_DE_PASSE]` par le mot de passe créé à l'étape 1, et `[VOTRE_NOUVEL_ID_PROJET]` par l'ID de votre tout nouveau projet visible dans l'URL de votre dashboard Supabase).*

---

### Méthode B : Via la CLI Supabase (Outil officiel)

Si vous utilisez le CLI de Supabase sur votre ordinateur :

1. Initialisez un projet local si ce n'est pas déjà fait :
   ```bash
   supabase init
   ```
2. Liez votre ordinateur à votre ancienne base de données pour récupérer la configuration :
   ```bash
   supabase link --project-ref zzasndslgzztichpiudv
   ```
3. Téléchargez le schéma de l'ancienne base :
   ```bash
   supabase db pull
   ```
4. Liez votre ordinateur à votre **nouveau** projet Supabase :
   ```bash
   supabase link --project-ref [VOTRE_NOUVEL_ID_PROJET]
   ```
5. Poussez le schéma sur votre nouvelle base de données :
   ```bash
   supabase db push
   ```

---

## Étape 3 : Configurer les buckets de stockage (Storage) sur le nouveau projet

Supabase n'inclus pas les buckets de stockage physiques dans les sauvegardes SQL standard. Vous devez recréer deux dossiers (buckets) importants :

1. Allez dans le menu **Storage** de votre nouveau Dashboard Supabase.
2. Cliquez sur **New Bucket** et créez les deux buckets suivants (vérifiez bien qu'ils soient en **Public** ou configurés comme auparavant) :
   * `branding`
   * `documents`
3. Exécutez le script SQL présent dans `supabase_setup.sql` si nécessaire pour recréer les politiques d'accès de sécurité (RLS) associées au stockage.

---

## Étape 4 : Mettre à jour l'application sur Google AI Studio

Pour connecter cette application à votre nouveau projet Supabase, vous devez mettre à jour les clés secrètes :

1. Dans **Google AI Studio Build**, accédez au menu **Settings** (icône d'engrenage) en haut ou à gauche.
2. Allez dans l'onglet **Secrets / Environment Variables**.
3. Mettez à jour les deux variables suivantes avec les nouvelles valeurs de votre nouveau projet (que vous trouverez sous *Project Settings > API* sur Supabase.com) :
   * **`VITE_SUPABASE_URL`** (ex : `https://[NOUVEAL_ID].supabase.co`)
   * **`VITE_SUPABASE_ANON_KEY`** (votre nouvelle clé publique anonyme)
4. L'application se rafraîchira automatiquement et pointera désormais sur votre nouveau projet neuf !
