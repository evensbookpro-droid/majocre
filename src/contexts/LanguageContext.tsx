import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'es' | 'fr';

interface TranslationDictionary {
  [key: string]: {
    [lang in Language]: string | string[] | any;
  };
}

export const translations: TranslationDictionary = {
  common: {
    es: {
      email: "Correo electrónico",
      password: "Contraseña",
      loading: "Cargando...",
      success: "Éxito",
      error: "Error",
      info: "Información",
      close: "Cerrar",
      back: "Volver",
      save: "Guardar",
      cancel: "Cancelar",
      logout: "Cerrar sesión",
      role_user: "Mi Espacio",
      role_admin: "Admin",
      role_superadmin: "Super Admin",
      powered_by: "Conexión 100% segura y cifrada",
      refresh: "Actualizar aplicación",
    },
    fr: {
      email: "Adresse Email",
      password: "Mot de passe",
      loading: "Chargement...",
      success: "Succès",
      error: "Erreur",
      info: "Information",
      close: "Fermer",
      back: "Retour",
      save: "Enregistrer",
      cancel: "Annuler",
      logout: "Se déconnecter",
      role_user: "Mon Espace",
      role_admin: "Admin",
      role_superadmin: "Super Admin",
      powered_by: "Connexion 100% sécurisée et cryptée",
      refresh: "Actualiser l'application",
    }
  },
  supabaseError: {
    es: {
      title: "Problema de Configuración de Supabase",
      desc: "La aplicación no pudo inicializarse porque sus variables de enlace a Supabase faltan, están incompletas o mal escritas:",
      solution_title: "¿Cómo resolver este problema?",
      step_1: "Abra el menú Configuración (Settings) o la pestaña de Secretos de Entorno en AI Studio.",
      step_2: "Declare la variable VITE_SUPABASE_URL con la URL de su proyecto Supabase (ej: https://xxxx.supabase.co). Asegúrese de incluir el protocolo https:// al principio.",
      step_3: "Declare la variable VITE_SUPABASE_ANON_KEY con su clave anónima de Supabase (anon public key).",
      step_4: "¡No olvide ejecutar el script SQL supabase_setup.sql en el editor SQL de su panel de Supabase para crear las tablas!",
      missing_config: "La configuración de Supabase no se encuentra. Defina VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.",
      invalid_url: "La URL de Supabase no es válida: \"{url}\". Debe comenzar con http:// o https://.",
    },
    fr: {
      title: "Problème de Configuration Supabase",
      desc: "L'application n'a pas pu s'initialiser car ses variables de liaison à Supabase sont absentes, incomplètes ou mal orthographiées :",
      solution_title: "Comment résoudre ce problème ?",
      step_1: "Ouvrez le menu Paramètres (Settings) ou l'onglet Secrets d'Environnement dans AI Studio.",
      step_2: "Déclarez la variable VITE_SUPABASE_URL avec l'URL de votre projet Supabase (ex: https://xxxx.supabase.co). Assurez-vous d'inclure le protocole https:// au début.",
      step_3: "Déclarez la variable VITE_SUPABASE_ANON_KEY avec votre clé anonyme Supabase (anon public key).",
      step_4: "N'oubliez pas d'exécuter le script SQL supabase_setup.sql dans l'éditeur SQL de votre panel Supabase afin de créer les tables !",
      missing_config: "La configuration de Supabase est manquante. Veuillez définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.",
      invalid_url: "L'URL de Supabase est invalide : \"{url}\". Elle doit obligatoirement commencer par http:// ou https://.",
    }
  },
  login: {
    es: {
      title: "Iniciar Sesión",
      subtitle: "Inicie sesión en su cuenta de {siteName}",
      forgot_password: "¿Olvidó su contraseña?",
      success_msg: "¡Inicio de sesión exitoso! Bienvenido.",
      loading_msg: "Autenticación segura...",
      btn_login: "Iniciar sesión",
      no_account: "¿No tiene una cuenta?",
      register_link: "Regístrese",
    },
    fr: {
      title: "Connexion",
      subtitle: "Connectez-vous à votre compte {siteName}",
      forgot_password: "Oublié ?",
      success_msg: "Connexion réussie ! Bienvenue.",
      loading_msg: "Authentification sécurisée...",
      btn_login: "Se connecter",
      no_account: "Vous n'avez pas de compte ?",
      register_link: "Inscrivez-vous",
    }
  },
  forgotPassword: {
    es: {
      title: "¿Olvidó su contraseña?",
      subtitle: "Ingrese su dirección de correo electrónico para recibir un enlace de restablecimiento.",
      placeholder_email: "nombre@ejemplo.com",
      success_msg: "¡Instrucciones enviadas por correo electrónico!",
      loading_msg: "Enviando...",
      btn_send: "Enviar enlace",
      back_to_login: "Volver al inicio de sesión",
      error_sending: "Ocurrió un error al enviar el correo electrónico de recuperación.",
    },
    fr: {
      title: "Mot de passe oublié ?",
      subtitle: "Saisissez votre adresse email pour recevoir un lien de réinitialisation.",
      placeholder_email: "nom@exemple.com",
      success_msg: "Instructions envoyées par email !",
      loading_msg: "Envoi en cours...",
      btn_send: "Envoyer le lien",
      back_to_login: "Retour à la connexion",
      error_sending: "Une erreur est survenue lors de l'envoi du mail de récupération.",
    }
  },
  resetPassword: {
    es: {
      title: "Restablecer contraseña",
      subtitle: "Ingrese su nueva contraseña a continuación.",
      new_password: "Nueva contraseña",
      confirm_password: "Confirmar contraseña",
      error_mismatch: "Las contraseñas no coinciden.",
      error_length: "La contraseña debe tener al menos 6 caracteres.",
      error_general: "Ocurrió un error durante el restablecimiento.",
      success_msg: "¡Contraseña guardada! Redirigiendo...",
      loading_msg: "Guardando...",
      btn_save: "Guardar contraseña",
    },
    fr: {
      title: "Réinitialiser",
      subtitle: "Saisissez votre nouveau mot de passe ci-dessous.",
      new_password: "Nouveau mot de passe",
      confirm_password: "confirmer le mot de passe",
      error_mismatch: "Les mots de passe ne correspondent pas.",
      error_length: "Le mot de passe doit contenir au moins 6 caractères.",
      error_general: "Une erreur est survenue lors de la réinitialisation.",
      success_msg: "Mot de passe enregistré ! Redirection...",
      loading_msg: "Enregistrement...",
      btn_save: "Enregistrer le mot de passe",
    }
  },
  register: {
    es: {
      back_tooltip: "Volver al inicio de sesión",
      title: "Registro",
      subtitle: "Cree su cuenta de {siteName}",
      first_name: "Nombre",
      last_name: "Apellido",
      placeholder_first_name: "Juan",
      placeholder_last_name: "Pérez",
      placeholder_email: "nombre@ejemplo.com",
      phone: "Teléfono",
      placeholder_phone: "+34 600 000 000",
      loan_details_title: "Detalles de la solicitud de préstamo",
      loan_amount: "Monto del préstamo (€)",
      placeholder_amount: "5000",
      duration: "Duración (Meses)",
      months_6: "6 meses",
      months_12: "12 meses",
      months_24: "24 meses",
      months_36: "36 meses",
      months_48: "48 meses",
      repayment_method: "Frecuencia de pago",
      method_monthly: "Mensual",
      method_quarterly: "Trimestral",
      monthly_income: "Ingresos mensuales (€)",
      placeholder_income: "2500",
      dependents: "Hijos a cargo",
      identity_doc: "Documento de identidad (Escaneo/Foto)",
      upload_placeholder: "Haga clic para cargar (JPG, PNG o PDF)",
      error_file_missing: "Por favor agregue su documento de identidad",
      error_user_info: "Error: No se pudo recuperar la información del usuario.",
      error_storage: "Error de almacenamiento: ",
      error_loan_request: "Cuenta creada, pero ocurrió un error al enviar la solicitud de préstamo: ",
      success_msg: "¡Cuenta creada con éxito! Revise su correo electrónico si es necesario.",
      loading_msg: "Creación segura...",
      btn_register: "Crear una cuenta",
      has_account: "¿Ya tiene una cuenta?",
      login_link: "Inicie sesión",
    },
    fr: {
      back_tooltip: "Retour au login",
      title: "Inscription",
      subtitle: "Créez votre compte {siteName}",
      first_name: "Prénom",
      last_name: "Nom",
      placeholder_first_name: "Jean",
      placeholder_last_name: "Dupont",
      placeholder_email: "nom@exemple.com",
      phone: "Téléphone",
      placeholder_phone: "+33 6 00 00 00 00",
      loan_details_title: "Détails de la demande de prêt",
      loan_amount: "Montant du prêt (€)",
      placeholder_amount: "5000",
      duration: "Durée (Mois)",
      months_6: "6 mois",
      months_12: "12 mois",
      months_24: "24 mois",
      months_36: "36 mois",
      months_48: "48 mois",
      repayment_method: "Nombre de mensualités",
      method_monthly: "Mensuel",
      method_quarterly: "Trimestriel",
      monthly_income: "Revenus Mensuels (€)",
      placeholder_income: "2500",
      dependents: "Enfants à charge",
      identity_doc: "Pièce d'identité (Scan/Photo)",
      upload_placeholder: "Cliquez pour uploader (JPG, PNG ou PDF)",
      error_file_missing: "Veuillez ajouter votre pièce d'identité",
      error_user_info: "Erreur : Impossible de récupérer les informations de l'utilisateur.",
      error_storage: "Erreur Storage: ",
      error_loan_request: "Compte créé, mais erreur lors de l'envoi de la demande de prêt : ",
      success_msg: "Compte créé avec succès ! Vérifiez vos emails si nécessaire.",
      loading_msg: "Création sécurisée...",
      btn_register: "Créer un compte",
      has_account: "Déjà un compte ? ",
      login_link: "Connectez-vous",
    }
  },
  loader: {
    es: {
      texts: [
        "Conexión segura...",
        "Inicializando el protocolo SSL...",
        "Cargando datos cifrados...",
        "Verificando certificados bancarios...",
        "Sincronizando con la red..."
      ],
      subMessage: "Protección Activa"
    },
    fr: {
      texts: [
        "Connexion sécurisée...",
        "Initialisation du protocole SSL...",
        "Chargement des données chiffrées...",
        "Vérification des certificats bancaires...",
        "Synchonisation avec le réseau..."
      ],
      subMessage: "Protection Active"
    }
  },
  appSettings: {
    es: {
      restricted_title: "Acceso Restringido",
      restricted_desc: "Lo sentimos, no tiene los permisos necesarios para acceder a la configuración global. Esta página está reservada únicamente para superadministradores.",
      auth_error: "Acción no autorizada. No eres superadministrador.",
      save_success: "¡Configuración guardada con éxito!",
      save_error: "Error al guardar.",
      title: "Configuración Global",
      subtitle: "Controle la apariencia y la identidad de su plataforma.",
      identity_title: "Identidad",
      site_name_label: "Nombre del sitio",
      colors_title: "Colores del tema",
      color_primary: "Primario",
      color_secondary: "Secundario",
      color_accent: "Acento",
      logo_title: "Logotipo de marca",
      logo_placeholder: "Haga clic para cargar su logotipo",
      logo_recommendation: "Formato recomendado: PNG o SVG transparente.",
      contact_title: "Contacto e información",
      contact_email: "Correo electrónico de contacto",
      contact_phone: "Teléfono de contacto",
      bank_info: "Información bancaria (IBAN)",
      footer_text: "Texto del pie de página (Footer)",
      btn_save: "Guardar modificaciones",
    },
    fr: {
      restricted_title: "Accès Restreint",
      restricted_desc: "Désolé, vous n'avez pas les permissions nécessaires pour accéder à la configuration globale. Cette page est réservée uniquement aux super-administrateurs.",
      auth_error: "Action non autorisée. Vous n'êtes pas super-administrateur.",
      save_success: "Paramètres enregistrés avec succès !",
      save_error: "Erreur lors de la sauvegarde.",
      title: "Configuration Globale",
      subtitle: "Contrôlez l'apparence et l'identité de votre plateforme.",
      identity_title: "Identité",
      site_name_label: "Nom du site",
      colors_title: "Couleurs du thème",
      color_primary: "Primaire",
      color_secondary: "Secondaire",
      color_accent: "Accent",
      logo_title: "Logo Branding",
      logo_placeholder: "Cliquez pour téléverser votre logo",
      logo_recommendation: "Format recommandé : PNG ou SVG transparent.",
      contact_title: "Contact & Informations",
      contact_email: "E-mail de contact",
      contact_phone: "Téléphone de contact",
      bank_info: "Informations Bancaires (IBAN)",
      footer_text: "Texte du pied de page (Footer)",
      btn_save: "Enregistrer les modifications",
    }
  },
  dashboard: {
    es: {
      tab_dashboard: "Tablero",
      tab_settings: "Configuración",
      notifications: "Notificaciones",
      mark_all_read: "Marcar todo como leído",
      no_notifications: "No hay notificaciones",
      balance_title: "Saldo Disponible",
      card_transfer: "Transferencia",
      card_loan: "Solicitar un préstamo",
      card_my_loan: "Mi Préstamo",
      card_history: "Historial",
      
      // Transfer Flow
      transfer_amount_label: "Monto",
      transfer_recipient_label: "Destinatario",
      transfer_recipient_placeholder: "Nombre del beneficiario",
      transfer_btn_insufficient: "Saldo insuficiente",
      transfer_btn_initiate: "Iniciar transferencia",
      transfer_active_title: "Transferencia en curso",
      transfer_status_completed: "Completado",
      transfer_status_rejected: "Rechazado",
      transfer_stage_verification: "Verificación",
      transfer_stage_network: "Red bancaria",
      transfer_stage_validation: "Validación final",
      transfer_stage_completed: "Transferencia completada",
      
      // Transfer Blocking / OTP
      otp_security_check: "Verificación de seguridad",
      otp_required_desc: "Código requerido para continuar con la transferencia a {name}.",
      otp_input_placeholder: "Ingrese el código de seguridad de 6 dígitos",
      otp_validating: "Validando...",
      otp_validate_btn: "Validar código",
      otp_request_support: "Solicitar asistencia",
      otp_support_disclaimer: "Si no tiene el código de seguridad o su transferencia está bloqueada, haga clic arriba para chatear con un asesor.",
      otp_resume_title: "Transferencia pendiente detectada",
      otp_resume_desc: "Tiene una transferencia pendiente de {amount}€ para {recipient} a ({progress}%). ¿Qué desea hacer?",
      otp_resume_btn: "Reanudar transferencia",
      otp_discard_btn: "Descartar y crear nueva",

      // Loan Request
      loan_status_pending: "Pendiente",
      loan_status_approved: "Aprobado",
      loan_status_rejected: "Rechazado",
      loan_request_title: "Solicitud de préstamo rápido",
      loan_request_desc: "Obtenga financiamiento inmediato acreditado directamente en su saldo después de la validación del administrador.",
      loan_amount_label: "Monto deseado (€)",
      loan_duration_label: "Duración del reembolso",
      loan_method_label: "Frecuencia de pago",
      loan_btn_submitting: "Enviando solicitud...",
      loan_btn_submit: "Enviar mi solicitud de préstamo",
      loan_active_title: "Su Préstamo Activo",
      loan_approved_desc: "¡Su solicitud de préstamo de {amount}€ ha sido aprobada!",
      loan_repaid_label: "Monto total reembolsado",
      loan_remaining_label: "Restante por pagar",
      loan_repay_now_title: "Realizar un reembolso",
      loan_repay_amount_label: "Monto del reembolso (€)",
      loan_repay_method_label: "Método de pago",
      loan_repay_ref_label: "Referencia de pago (ej. ID de transacción)",
      loan_repay_ref_placeholder: "Ingrese la referencia",
      loan_repay_btn_loading: "Enviando reembolso...",
      loan_repay_btn_submit: "Enviar comprobante de reembolso",
      loan_history_title: "Historial de reembolsos",
      loan_no_history: "Aún no hay reembolsos registrados.",
      loan_pending_approval: "Solicitud en espera de aprobación",
      loan_pending_desc: "Su solicitud de préstamo de {amount}€ está siendo evaluada por nuestro equipo financiero.",
      loan_no_active: "No tiene préstamos activos.",
      loan_no_active_desc: "Puede solicitar un préstamo en cualquier momento completando el formulario a la izquierda.",

      // Transactions History
      transactions_title: "Historial de transacciones",
      tx_type_credit: "Crédito",
      tx_type_debit: "Débito",
      tx_type_transfer: "Transferencia",
      tx_from: "De",
      tx_to: "Para",
      tx_repayment_for: "Reembolso para",
      tx_repayment: "Reembolso",
      tx_no_transactions: "Aún no se han registrado transacciones.",

      // Support Chat
      support_chat_title: "Soporte y Asistencia",
      support_chat_welcome: "Hola, ¿en qué podemos ayudarte hoy? Un asesor te responderá a la brevedad.",
      support_admin_users: "Usuarios con soporte activo",
      support_no_active_chats: "No hay chats de soporte activos en este momento.",
      support_input_placeholder: "Escriba su mensaje...",
      support_btn_send: "Enviar",
      support_msg_admin: "Asesor Financiero",
      support_msg_user: "Usted",

      // Admin Panel - Stats & Users
      admin_stats_title: "Estadísticas Generales",
      admin_stat_users: "Usuarios registrados",
      admin_stat_balance: "Volumen total de depósitos",
      admin_stat_transfers: "Transferencias totales",
      admin_stat_transactions: "Transacciones procesadas",
      admin_users_title: "Gestión de Usuarios",
      admin_users_search: "Buscar un usuario...",
      admin_user_table_name: "Nombre / Correo electrónico",
      admin_user_table_balance: "Saldo actual",
      admin_user_table_role: "Rol",
      admin_user_table_actions: "Acciones",
      admin_user_delete_confirm: "¿Está seguro de que desea eliminar a este usuario?",
      admin_user_btn_update: "Actualizar",
      
      // Admin Panel - Loan Requests Management
      admin_loans_title: "Solicitudes de Préstamos",
      admin_loans_applicant: "Solicitante",
      admin_loans_amount: "Monto",
      admin_loans_duration: "Duración",
      admin_loans_repayment: "Frecuencia",
      admin_loans_status: "Estado",
      admin_loans_actions: "Acciones",
      admin_loans_btn_approve: "Aprobar",
      admin_loans_btn_reject: "Rechazar",
      admin_loans_empty: "No hay solicitudes de préstamo pendientes.",

      // Admin Panel - Repayments Validation
      admin_repayments_title: "Validación de Reembolsos",
      admin_repayments_user: "Usuario",
      admin_repayments_amount: "Monto",
      admin_repayments_method: "Método",
      admin_repayments_ref: "Referencia",
      admin_repayments_status: "Estado",
      admin_repayments_btn_validate: "Validar",
      admin_repayments_status_pending: "Pendiente",
      admin_repayments_status_confirmed: "Confirmado",
      admin_repayments_empty: "No hay reembolsos pendientes de validación.",

      // Admin Panel - OTP Codes Generator
      admin_otp_title: "Generador de códigos OTP",
      admin_otp_desc: "Genere códigos de seguridad válidos de un solo uso para desbloquear las transferencias de los usuarios.",
      admin_otp_btn_generate: "Generar un nuevo código OTP",
      admin_otp_table_code: "Código OTP",
      admin_otp_table_status: "Estado",
      admin_otp_status_unused: "Disponible",
      admin_otp_status_used: "Utilizado",
      admin_otp_empty: "Aún no se han generado códigos OTP.",

      // Transfer Detail Modal / Quick View (Admin)
      admin_transfer_details_title: "Detalles del Transferencia",
      admin_transfer_details_sender: "Remitente",
      admin_transfer_details_recipient: "Destinatario",
      admin_transfer_details_amount: "Monto",
      admin_transfer_details_progress: "Progreso actual",
      admin_transfer_details_status: "Estado",
      admin_transfer_details_force_progress: "Forzar progreso (%)",
      admin_transfer_details_btn_force: "Forzar",
      admin_transfer_details_btn_approve: "Aprobar y finalizar",
      admin_transfer_details_btn_reject: "Rechazar transferencia",
      notif_insufficient_balance: "Saldo insuficiente para realizar esta transferencia.",
      notif_unfinished_transfer: "Tiene una transferencia inconclusa en proceso de finalización.",
      notif_init_error: "Error al inicializar la transferencia: ",
      notif_resume_transfer: "Reanudando transferencia en curso...",
      notif_abandon_transfer: "Transferencia anterior abandonada.",
      notif_invalid_amount: "Por favor ingrese un monto válido",
      notif_loan_submitted: "Su solicitud de préstamo ha sido enviada con éxito",
      notif_loan_submit_error: "Error al enviar la solicitud: ",
      notif_otp_validated: "Código de seguridad validado con éxito",
      notif_otp_invalid: "Código de seguridad inválido",
      notif_otp_error: "Error al validar el código",
      notif_transfer_completed: "Transferencia de {amount}€ a {recipient} completada",
      notif_transfer_error: "Error al finalizar la transferencia",
      notif_loan_approved: "Solicitud de préstamo aprobada con éxito",
      notif_loan_approve_error: "Error al aprobar: ",
      notif_loan_rejected: "Solicitud de préstamo rechazada",
      notif_loan_reject_error: "Error al rechazar: ",
      notif_otp_generated: "Nuevo código OTP generado con éxito",
      notif_otp_gen_error: "Error al generar el código: ",
      notif_repayment_validated: "Reembolso validado con éxito",
      notif_repayment_val_error: "Error al validar: ",
      notif_repayment_submitted: "Solicitud de reembolso enviada",
      notif_repayment_submit_error: "Error al enviar el reembolso: ",
      notif_balance_updated: "Saldo actualizado con éxito",
      notif_balance_update_error: "Error al actualizar el saldo: ",
      notif_delete_self_error: "No puede eliminar su propia cuenta.",
      notif_user_deleted: "Usuario eliminado con éxito.",
      notif_user_delete_error: "Error al eliminar: ",
      notif_transfer_accepted: "Transferencia aceptada y completada con éxito",
      notif_transfer_accept_error: "Error al aceptar: ",
      notif_transfer_rejected: "Transferencia rechazada con éxito",
      notif_transfer_reject_error: "Error al rechazar: ",
    },
    fr: {
      tab_dashboard: "Tableau de bord",
      tab_settings: "Paramètres",
      notifications: "Notifications",
      mark_all_read: "Tout marquer comme lu",
      no_notifications: "Aucune notification",
      balance_title: "Solde Disponible",
      card_transfer: "Transfert",
      card_loan: "Demander un prêt",
      card_my_loan: "Mon Prêt",
      card_history: "Historique",

      // Transfer Flow
      transfer_amount_label: "Montant",
      transfer_recipient_label: "Destinataire",
      transfer_recipient_placeholder: "Nom du bénéficiaire",
      transfer_btn_insufficient: "Solde insuffisant",
      transfer_btn_initiate: "Initier le transfert",
      transfer_active_title: "Transfert en cours",
      transfer_status_completed: "Terminé",
      transfer_status_rejected: "Rejeté",
      transfer_stage_verification: "Vérification",
      transfer_stage_network: "Réseau bancaire",
      transfer_stage_validation: "Validation finale",
      transfer_stage_completed: "Transfert terminé",

      // Transfer Blocking / OTP
      otp_security_check: "Vérification de sécurité",
      otp_required_desc: "Code requis pour continuer le transfert vers {name}.",
      otp_input_placeholder: "Saisir le code de sécurité à 6 chiffres",
      otp_validating: "Validation...",
      otp_validate_btn: "Valider le code",
      otp_request_support: "Demander de l'assistance",
      otp_support_disclaimer: "Si vous ne possédez pas le code de sécurité ou si votre transfert est bloqué, cliquez ci-dessus pour échanger avec un conseiller.",
      otp_resume_title: "Transfert non achevé détecté",
      otp_resume_desc: "Vous avez un transfert en attente de {amount}€ vers {recipient} à ({progress}%). Que souhaitez-vous faire ?",
      otp_resume_btn: "Reprendre le transfert",
      otp_discard_btn: "Abandonner et en créer un nouveau",

      // Loan Request
      loan_status_pending: "En attente",
      loan_status_approved: "Approuvé",
      loan_status_rejected: "Rejeté",
      loan_request_title: "Demande de crédit rapide",
      loan_request_desc: "Obtenez un financement immédiat crédité directement sur votre solde après validation par l'administration.",
      loan_amount_label: "Montant souhaité (€)",
      loan_duration_label: "Durée de remboursement",
      loan_method_label: "Nombre de mensualités",
      loan_btn_submitting: "Soumission en cours...",
      loan_btn_submit: "Soumettre ma demande de prêt",
      loan_active_title: "Votre Prêt Actif",
      loan_approved_desc: "Votre demande de prêt de {amount}€ a été approuvée !",
      loan_repaid_label: "Montant total remboursé",
      loan_remaining_label: "Reste à payer",
      loan_repay_now_title: "Effectuer un remboursement",
      loan_repay_amount_label: "Montant du remboursement (€)",
      loan_repay_method_label: "Moyen de paiement",
      loan_repay_ref_label: "Référence du paiement (ex: ID transaction)",
      loan_repay_ref_placeholder: "Saisir la référence",
      loan_repay_btn_loading: "Soumission du remboursement...",
      loan_repay_btn_submit: "Envoyer la preuve de remboursement",
      loan_history_title: "Historique des remboursements",
      loan_no_history: "Aucun remboursement enregistré pour le moment.",
      loan_pending_approval: "Demande en cours d'approbation",
      loan_pending_desc: "Votre demande de prêt de {amount}€ est en cours d'étude par notre comité financier.",
      loan_no_active: "Vous n'avez aucun prêt actif.",
      loan_no_active_desc: "Vous pouvez effectuer une demande de prêt à tout moment en remplissant le formulaire ci-contre.",

      // Transactions History
      transactions_title: "Historique des transactions",
      tx_type_credit: "Crédit",
      tx_type_debit: "Débit",
      tx_type_transfer: "Transfert",
      tx_from: "De",
      tx_to: "Pour",
      tx_repayment_for: "Remboursement pour",
      tx_repayment: "Remboursement",
      tx_no_transactions: "Aucune transaction enregistrée pour le moment.",

      // Support Chat
      support_chat_title: "Support & Assistance",
      support_chat_welcome: "Bonjour, comment pouvons-nous vous aider aujourd'hui ? Un conseiller va vous répondre.",
      support_admin_users: "Utilisateurs avec support actif",
      support_no_active_chats: "Aucune discussion de support active pour le moment.",
      support_input_placeholder: "Écrivez votre message...",
      support_btn_send: "Envoyer",
      support_msg_admin: "Conseiller Financier",
      support_msg_user: "Vous",

      // Admin Panel - Stats & Users
      admin_stats_title: "Statistiques Générales",
      admin_stat_users: "Utilisateurs inscrits",
      admin_stat_balance: "Volume total des dépôts",
      admin_stat_transfers: "Transferts totaux",
      admin_stat_transactions: "Transactions traitées",
      admin_users_title: "Gestion des Utilisateurs",
      admin_users_search: "Rechercher un utilisateur...",
      admin_user_table_name: "Nom / Email",
      admin_user_table_balance: "Solde Actuel",
      admin_user_table_role: "Rôle",
      admin_user_table_actions: "Actions",
      admin_user_delete_confirm: "Êtes-vous sûr de vouloir supprimer cet utilisateur ?",
      admin_user_btn_update: "Mettre à jour",

      // Admin Panel - Loan Requests Management
      admin_loans_title: "Demandes de Prêts",
      admin_loans_applicant: "Demandeur",
      admin_loans_amount: "Montant",
      admin_loans_duration: "Durée",
      admin_loans_repayment: "Fréquence",
      admin_loans_status: "Statut",
      admin_loans_actions: "Actions",
      admin_loans_btn_approve: "Approuver",
      admin_loans_btn_reject: "Rejeter",
      admin_loans_empty: "Aucune demande de prêt en attente.",

      // Admin Panel - Repayments Validation
      admin_repayments_title: "Validation des Remboursements",
      admin_repayments_user: "Utilisateur",
      admin_repayments_amount: "Montant",
      admin_repayments_method: "Méthode",
      admin_repayments_ref: "Référence",
      admin_repayments_status: "Statut",
      admin_repayments_btn_validate: "Valider",
      admin_repayments_status_pending: "En attente",
      admin_repayments_status_confirmed: "Confirmé",
      admin_repayments_empty: "Aucun remboursement en attente de validation.",

      // Admin Panel - OTP Codes Generator
      admin_otp_title: "Générateur de codes OTP",
      admin_otp_desc: "Générez des codes de sécurité à usage unique valides pour débloquer les transferts des utilisateurs.",
      admin_otp_btn_generate: "Générer un nouveau code OTP",
      admin_otp_table_code: "Code OTP",
      admin_otp_table_status: "Statut",
      admin_otp_status_unused: "Disponible",
      admin_otp_status_used: "Utilisé",
      admin_otp_empty: "Aucun code OTP généré pour le moment.",

      // Transfer Detail Modal / Quick View (Admin)
      admin_transfer_details_title: "Détails du Transfert",
      admin_transfer_details_sender: "Émetteur",
      admin_transfer_details_recipient: "Destinataire",
      admin_transfer_details_amount: "Montant",
      admin_transfer_details_progress: "Progression actuelle",
      admin_transfer_details_status: "Statut",
      admin_transfer_details_force_progress: "Forcer progression (%)",
      admin_transfer_details_btn_force: "Forcer",
      admin_transfer_details_btn_approve: "Accepter & finaliser",
      admin_transfer_details_btn_reject: "Rejeter le transfert",
      notif_insufficient_balance: "Solde insuffisant pour effectuer ce transfert.",
      notif_unfinished_transfer: "Vous avez un transfert non achevé en cours de finalisation.",
      notif_init_error: "Erreur lors de l'initialisation du transfert: ",
      notif_resume_transfer: "Reprise du transfert en cours...",
      notif_abandon_transfer: "Ancien transfert abandonné.",
      notif_invalid_amount: "Veuillez entrer un montant valide",
      notif_loan_submitted: "Votre demande de prêt a été soumise avec succès",
      notif_loan_submit_error: "Erreur lors de la soumission de la demande: ",
      notif_otp_validated: "Code de sécurité validé avec succès",
      notif_otp_invalid: "Code de sécurité invalide",
      notif_otp_error: "Erreur lors de la validation du code",
      notif_transfer_completed: "Transfert de {amount}€ vers {recipient} terminé",
      notif_transfer_error: "Erreur lors de la finalisation du transfert",
      notif_loan_approved: "Demande de prêt approuvée avec succès",
      notif_loan_approve_error: "Erreur lors de l'approbation: ",
      notif_loan_rejected: "Demande de prêt rejetée",
      notif_loan_reject_error: "Erreur lors du rejet: ",
      notif_otp_generated: "Nouveau code OTP généré avec succès",
      notif_otp_gen_error: "Erreur lors de la génération du code: ",
      notif_repayment_validated: "Remboursement validé avec succès",
      notif_repayment_val_error: "Erreur lors de la validation: ",
      notif_repayment_submitted: "Demande de remboursement envoyée",
      notif_repayment_submit_error: "Erreur lors du remboursement: ",
      notif_balance_updated: "Solde mis à jour avec succès",
      notif_balance_update_error: "Erreur lors de la mise à jour du solde: ",
      notif_delete_self_error: "Vous ne pouvez pas supprimer votre propre compte.",
      notif_user_deleted: "Utilisateur supprimé avec succès.",
      notif_user_delete_error: "Erreur lors de la suppression: ",
      notif_transfer_accepted: "Transfert accepté et complété avec succès",
      notif_transfer_accept_error: "Erreur lors de l'acceptation: ",
      notif_transfer_rejected: "Transfert rejeté avec succès",
      notif_transfer_reject_error: "Erreur lors du rejet: ",
    }
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (category: string, key: string, replacements?: Record<string, string | number>) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_lang');
      if (saved === 'es' || saved === 'fr') {
        return saved;
      }
    }
    return 'es'; // default to Spanish
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_lang', lang);
    }
  };

  const t = (category: string, key: string, replacements?: Record<string, string | number>) => {
    const categoryDict = translations[category];
    if (!categoryDict) {
      console.warn(`Translation category "${category}" not found`);
      return key;
    }
    const langDict = categoryDict[language] || categoryDict['es'];
    if (!langDict) {
      console.warn(`No language dictionary found for "${language}" or default "es" in category "${category}"`);
      return key;
    }
    let value = langDict[key];
    if (value === undefined && language !== 'es') {
      const fallbackDict = categoryDict['es'];
      if (fallbackDict) {
        value = fallbackDict[key];
      }
    }
    if (value === undefined) {
      console.warn(`Translation key "${key}" not found in category "${category}"`);
      return key;
    }

    if (typeof value === 'string' && replacements) {
      let result = value;
      Object.entries(replacements).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
      return result;
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Simple Language Selector component for consistent UI placement
export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1.5 bg-zinc-900/85 border border-zinc-800 rounded-xl p-1 shadow-sm backdrop-blur-md">
      <button
        onClick={() => setLanguage('es')}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all duration-200 active:scale-95 ${
          language === 'es'
            ? 'bg-brand text-black shadow-md shadow-brand/10 font-black'
            : 'text-zinc-400 hover:text-white'
        }`}
        type="button"
      >
        ES
      </button>
      <button
        onClick={() => setLanguage('fr')}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all duration-200 active:scale-95 ${
          language === 'fr'
            ? 'bg-brand text-black shadow-md shadow-brand/10 font-black'
            : 'text-zinc-400 hover:text-white'
        }`}
        type="button"
      >
        FR
      </button>
    </div>
  );
};
