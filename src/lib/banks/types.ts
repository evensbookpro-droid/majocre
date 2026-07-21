export interface Bank {
  id?: number;
  country_code: string;
  bank_code: string;
  bank_name: string;
  bic: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  sepa_supported: boolean;
  updated_at?: string;
  created_at?: string;
  european_code?: string | null;
  lei?: string | null;
  category?: string | null;
  parent_entity?: string | null;
  report_flag?: string | null;
}

export interface IbanCache {
  id?: number;
  iban: string;
  country: string;
  bank_code: string | null;
  bank_name: string | null;
  bic: string | null;
  city: string | null;
  sepa: boolean;
  cached_at?: string;
}

export interface DatasetMeta {
  id: string;
  countryCode: string;
  countryName: string;
  datasetName: string;
  uploadDate: string;
  importedRows: number;
  updatedRows: number;
  ignoredRows: number;
  errors: number;
  status: 'idle' | 'processing' | 'success' | 'failed';
}

export interface ImportReport {
  importedRows: number;
  updatedRows: number;
  ignoredRows: number;
  errorsList: string[];
  executionTimeMs: number;
}
