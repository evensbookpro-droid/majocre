export type FieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'tel'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file';

export interface RegistrationField {
  id: string;
  name: string;
  label: string;
  label_es?: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  placeholder_es?: string;
  visible: boolean;
  order: number;
  options?: string; // format: "val1:label1,val2:label2" or "val1,val2"
  is_custom: boolean;
}

export const DEFAULT_REGISTRATION_FIELDS: RegistrationField[] = [
  {
    id: 'firstName',
    name: 'firstName',
    label: 'Prénom',
    label_es: 'Nombre',
    type: 'text',
    required: true,
    placeholder: 'Prénom',
    placeholder_es: 'Nombre de pila',
    visible: true,
    order: 1,
    is_custom: false
  },
  {
    id: 'lastName',
    name: 'lastName',
    label: 'Nom',
    label_es: 'Apellido',
    type: 'text',
    required: true,
    placeholder: 'Nom de famille',
    placeholder_es: 'Apellido de familia',
    visible: true,
    order: 2,
    is_custom: false
  },
  {
    id: 'email',
    name: 'email',
    label: 'Adresse e-mail',
    label_es: 'Correo electrónico',
    type: 'email',
    required: true,
    placeholder: 'votre@email.com',
    placeholder_es: 'su@correo.com',
    visible: true,
    order: 3,
    is_custom: false
  },
  {
    id: 'password',
    name: 'password',
    label: 'Mot de passe',
    label_es: 'Contraseña',
    type: 'text', // using password inputs visually, but base type is text
    required: true,
    placeholder: '••••••••',
    placeholder_es: '••••••••',
    visible: true,
    order: 4,
    is_custom: false
  },
  {
    id: 'phone',
    name: 'phone',
    label: 'Numéro de téléphone',
    label_es: 'Número de teléfono',
    type: 'tel',
    required: true,
    placeholder: '+33 6 12 34 56 78',
    placeholder_es: '+34 612 34 56 78',
    visible: true,
    order: 5,
    is_custom: false
  },
  {
    id: 'loanAmount',
    name: 'loanAmount',
    label: 'Montant du prêt (€)',
    label_es: 'Monto del préstamo (€)',
    type: 'number',
    required: true,
    placeholder: 'ex: 5000',
    placeholder_es: 'ej: 5000',
    visible: true,
    order: 6,
    is_custom: false
  },
  {
    id: 'loanDuration',
    name: 'loanDuration',
    label: 'Durée du prêt',
    label_es: 'Duración del préstamo',
    type: 'select',
    required: true,
    options: '6:6 Mois / 6 Meses,12:12 Mois / 12 Meses,24:24 Mois / 24 Meses,36:36 Mois / 36 Meses,48:48 Mois / 48 Meses',
    visible: true,
    order: 7,
    is_custom: false
  },
  {
    id: 'loanRepaymentMethod',
    name: 'loanRepaymentMethod',
    label: 'Mode de remboursement',
    label_es: 'Modalidad de pago',
    type: 'select',
    required: true,
    options: 'monthly:Mensuel / Mensual,quarterly:Trimestriel / Trimestral',
    visible: true,
    order: 8,
    is_custom: false
  },
  {
    id: 'monthlyIncome',
    name: 'monthlyIncome',
    label: 'Revenus mensuels (€)',
    label_es: 'Ingresos mensuales (€)',
    type: 'number',
    required: true,
    placeholder: 'ex: 2500',
    placeholder_es: 'ej: 2500',
    visible: true,
    order: 9,
    is_custom: false
  },
  {
    id: 'dependents',
    name: 'dependents',
    label: 'Personnes à charge',
    label_es: 'Personas a cargo',
    type: 'select',
    required: true,
    options: '0:0,1:1,2:2,3:3,4:4+',
    visible: true,
    order: 10,
    is_custom: false
  },
  {
    id: 'file',
    name: 'file',
    label: "Pièce d'identité (Recto/Verso)",
    label_es: 'Documento de identidad (Frente/Dorso)',
    type: 'file',
    required: true,
    placeholder: "Glissez ou cliquez pour déposer un document (PDF, PNG, JPG)",
    placeholder_es: 'Arrastre o haga clic para subir un documento (PDF, PNG, JPG)',
    visible: true,
    order: 11,
    is_custom: false
  }
];

export const parseRegistrationFields = (jsonStr: string | null | undefined): RegistrationField[] => {
  if (!jsonStr) return DEFAULT_REGISTRATION_FIELDS;
  try {
    const parsed = JSON.parse(jsonStr) as RegistrationField[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all standard fields exist (in case admin deleted or cleared them)
      const merged = [...DEFAULT_REGISTRATION_FIELDS];
      parsed.forEach(field => {
        const idx = merged.findIndex(f => f.id === field.id);
        if (idx > -1) {
          merged[idx] = { ...merged[idx], ...field };
        } else if (field.is_custom) {
          merged.push(field);
        }
      });
      return merged.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  } catch (err) {
    console.error("Error parsing custom registration fields:", err);
  }
  return DEFAULT_REGISTRATION_FIELDS;
};
