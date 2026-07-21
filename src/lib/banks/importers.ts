import { Bank } from './types';

export interface Importer {
  countryCode: string;
  countryName: string;
  detect(headers: string[]): boolean;
  normalize(row: Record<string, string>): Bank | null;
}

function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        tmp[i][j] = tmp[i - 1][j - 1];
      } else {
        tmp[i][j] = Math.min(
          tmp[i - 1][j - 1] + 1, // substitution
          tmp[i - 1][j] + 1,     // deletion
          tmp[i][j - 1] + 1      // insertion
        );
      }
    }
  }
  return tmp[a.length][b.length];
}

function getSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;
  return (maxLength - getLevenshteinDistance(a, b)) / maxLength;
}

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Helper to dynamically clean and match field headers
 */
function matchHeader(headers: string[], searchTerms: string[], isBankCode: boolean = false): string | null {
  const normalized = headers.map(h => stripAccents(h.toLowerCase().trim()).replace(/[\s_\-\/]/g, ''));

  // 1. Prioritize exact matches first across all search terms
  for (const term of searchTerms) {
    const termNormalized = stripAccents(term.toLowerCase()).replace(/[\s_\-\/]/g, '');
    const index = normalized.indexOf(termNormalized);
    if (index !== -1) {
      const hNormalized = normalized[index];
      
      // Guard: Never allow "swift_code" or "bic" to be matched as "bank_code"
      const isSwiftOrBic = hNormalized.includes('swift') || hNormalized.includes('bic');
      if (isBankCode && isSwiftOrBic) {
        continue;
      }
      return headers[index];
    }
  }

  // 2. Strict similarity fallback matching
  const genericTerms = new Set(['code', 'name', 'nom', 'bezeichnung', 'ident', 'identifier', 'tipo', 'type']);

  for (const term of searchTerms) {
    const termNormalized = stripAccents(term.toLowerCase()).replace(/[\s_\-\/]/g, '');

    // Skip fallback/similarity matching for generic terms or very short terms
    if (genericTerms.has(termNormalized) || termNormalized.length <= 3) {
      continue;
    }

    let bestMatchIndex = -1;
    let bestSimilarity = 0;

    for (let i = 0; i < normalized.length; i++) {
      const hNormalized = normalized[i];

      // Guard: Never allow "swift_code" or "bic" to be matched as "bank_code"
      const isSwiftOrBic = hNormalized.includes('swift') || hNormalized.includes('bic');
      if (isBankCode && isSwiftOrBic) {
        continue;
      }

      const similarity = getSimilarity(termNormalized, hNormalized);
      // Require a strict similarity threshold of 0.8
      if (similarity >= 0.8 && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatchIndex = i;
      }
    }

    if (bestMatchIndex !== -1) {
      return headers[bestMatchIndex];
    }
  }

  return null;
}

/**
 * Abstract class to encapsulate common normalization and parsing logic
 */
export abstract class AbstractCountryImporter implements Importer {
  abstract countryCode: string;
  abstract countryName: string;
  abstract detectTerms: string[];

  // Define term mappings for common fields
  protected abstract bankCodeTerms: string[];
  protected abstract bankNameTerms: string[];
  protected abstract bicTerms: string[];
  protected cityTerms: string[] = ['city', 'ville', 'ort', 'ciudad', 'localite', 'poblacion', 'localidade', 'stadt', 'town'];
  protected postalCodeTerms: string[] = ['postal', 'zip', 'plz', 'cp', 'codigopostal', 'postcode'];
  protected addressTerms: string[] = ['address', 'adresse', 'direccion', 'dirección', 'rue', 'street', 'localizacion', 'morada'];
  protected websiteTerms: string[] = ['website', 'site', 'web', 'url', 'site_internet', 'sitio_web'];
  protected phoneTerms: string[] = ['phone', 'tel', 'telephone', 'telefono', 'telefona'];

  detect(headers: string[]): boolean {
    // If headers contain any of the specific local terms, we might match (with accent normalization)
    const normalized = headers.map(h => stripAccents(h.toLowerCase().trim()));
    return this.detectTerms.some(term => normalized.some(h => h.includes(stripAccents(term.toLowerCase()))));
  }

  normalize(row: Record<string, string>): Bank | null {
    const headers = Object.keys(row);
    
    const bankCodeKey = matchHeader(headers, this.bankCodeTerms, true);
    const bankNameKey = matchHeader(headers, this.bankNameTerms, false);
    const bicKey = matchHeader(headers, this.bicTerms, false);
    const cityKey = matchHeader(headers, this.cityTerms, false);
    const postalCodeKey = matchHeader(headers, this.postalCodeTerms, false);
    const addressKey = matchHeader(headers, this.addressTerms, false);
    const websiteKey = matchHeader(headers, this.websiteTerms, false);
    const phoneKey = matchHeader(headers, this.phoneTerms, false);

    if (!bankCodeKey || !bankNameKey) {
      return null; // Essential fields missing
    }

    const bankCode = row[bankCodeKey]?.trim();
    const bankName = row[bankNameKey]?.trim();

    if (!bankCode || !bankName) {
      return null; // Row is empty or invalid
    }

    return {
      country_code: this.countryCode,
      bank_code: bankCode,
      bank_name: bankName,
      bic: bicKey ? row[bicKey]?.trim() || null : null,
      city: cityKey ? row[cityKey]?.trim() || null : null,
      postal_code: postalCodeKey ? row[postalCodeKey]?.trim() || null : null,
      address: addressKey ? row[addressKey]?.trim() || null : null,
      website: websiteKey ? row[websiteKey]?.trim() || null : null,
      phone: phoneKey ? row[phoneKey]?.trim() || null : null,
      sepa_supported: true
    };
  }
}

// 1. Germany Importer
export class GermanyImporter extends AbstractCountryImporter {
  countryCode = 'DE';
  countryName = 'Germany';
  detectTerms = ['blz', 'bankleitzahl', 'bundesbank'];
  protected bankCodeTerms = ['blz', 'bankleitzahl', 'bank_code', 'code'];
  protected bankNameTerms = ['bankname', 'name', 'bezeichnung', 'institut'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];
}

// 2. Spain Importer
export class SpainImporter extends AbstractCountryImporter {
  countryCode = 'ES';
  countryName = 'Spain';
  detectTerms = ['entidad', 'banco de españa', 'codigo_entidad', 'codigo de supervisor', 'supervisor'];
  protected bankCodeTerms = ['codigo de supervisor', 'codigo_de_supervisor', 'codigodesupervisor', 'codigoentidad', 'entidad', 'codigo_entidad', 'banco_code', 'code'];
  protected bankNameTerms = ['nombre', 'entidad_nombre', 'denominacion', 'nombre_entidad', 'bank_name', 'name'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];

  override normalize(row: Record<string, string>): Bank | null {
    const headers = Object.keys(row);
    
    const bankCodeKey = matchHeader(headers, this.bankCodeTerms, true);
    const bankNameKey = matchHeader(headers, this.bankNameTerms, false);
    const bicKey = matchHeader(headers, this.bicTerms, false);
    const cityKey = matchHeader(headers, this.cityTerms, false);
    const postalCodeKey = matchHeader(headers, this.postalCodeTerms, false);
    
    // Custom/Spanish specific header lists
    const addressTermsSpain = ['direccion', 'dirección', 'address', 'adresse', 'rue', 'street', 'localizacion', 'morada'];
    const europeanCodeTerms = ['codigo europeo', 'código europeo', 'european_code', 'european code', 'codigoeuropeo'];
    const leiTerms = ['lei', 'lei_code', 'lei code'];
    const categoryTerms = ['categoria', 'categoría', 'category', 'categoria_entidad'];
    const parentEntityTerms = ['entidad matriz', 'entidad_matriz', 'parent_entity', 'parent entity', 'entidadmatriz'];
    const reportFlagTerms = ['informe', 'report_flag', 'report flag', 'report'];

    const addressKey = matchHeader(headers, addressTermsSpain, false);
    const websiteKey = matchHeader(headers, this.websiteTerms, false);
    const phoneKey = matchHeader(headers, this.phoneTerms, false);

    const europeanCodeKey = matchHeader(headers, europeanCodeTerms, false);
    const leiKey = matchHeader(headers, leiTerms, false);
    const categoryKey = matchHeader(headers, categoryTerms, false);
    const parentEntityKey = matchHeader(headers, parentEntityTerms, false);
    const reportFlagKey = matchHeader(headers, reportFlagTerms, false);

    if (!bankCodeKey || !bankNameKey) {
      return null; // Essential fields missing
    }

    const bankCode = row[bankCodeKey]?.trim();
    const bankName = row[bankNameKey]?.trim();

    if (!bankCode || !bankName) {
      return null; // Row is empty or invalid
    }

    return {
      country_code: this.countryCode,
      bank_code: bankCode,
      bank_name: bankName,
      bic: bicKey ? row[bicKey]?.trim() || null : null,
      city: cityKey ? row[cityKey]?.trim() || null : null,
      postal_code: postalCodeKey ? row[postalCodeKey]?.trim() || null : null,
      address: addressKey ? row[addressKey]?.trim() || null : null,
      website: websiteKey ? row[websiteKey]?.trim() || null : null,
      phone: phoneKey ? row[phoneKey]?.trim() || null : null,
      sepa_supported: true,
      
      // Optional Spanish-specific attributes
      european_code: europeanCodeKey ? row[europeanCodeKey]?.trim() || null : null,
      lei: leiKey ? row[leiKey]?.trim() || null : null,
      category: categoryKey ? row[categoryKey]?.trim() || null : null,
      parent_entity: parentEntityKey ? row[parentEntityKey]?.trim() || null : null,
      report_flag: reportFlagKey ? row[reportFlagKey]?.trim() || null : null
    };
  }
}

// 3. France Importer
export class FranceImporter extends AbstractCountryImporter {
  countryCode = 'FR';
  countryName = 'France';
  detectTerms = ['guichet', 'code_banque', 'etablissement'];
  protected bankCodeTerms = ['codebanque', 'code_banque', 'etablissement', 'code'];
  protected bankNameTerms = ['libelle', 'nom_banque', 'nom', 'etablissement_nom'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];
}

// 4. Belgium Importer
export class BelgiumImporter extends AbstractCountryImporter {
  countryCode = 'BE';
  countryName = 'Belgium';
  detectTerms = ['belgian_banks', 'bank_code_be', 'belgique'];
  protected bankCodeTerms = ['code', 'bank_code', 'sort_code'];
  protected bankNameTerms = ['nom', 'name', 'bank_name', 'nom_banque'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];
}

// 5. Italy Importer
export class ItalyImporter extends AbstractCountryImporter {
  countryCode = 'IT';
  countryName = 'Italy';
  detectTerms = ['abi', 'cab', 'banca_italia'];
  protected bankCodeTerms = ['abi', 'cab', 'codice_banca', 'code'];
  protected bankNameTerms = ['banca', 'ragione_sociale', 'nome_banca', 'denominazione'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];
}

// 6. Netherlands Importer
export class NetherlandsImporter extends AbstractCountryImporter {
  countryCode = 'NL';
  countryName = 'Netherlands';
  detectTerms = ['dnb', 'nederlandsche', 'bank_code_nl'];
  protected bankCodeTerms = ['bank_code', 'identifier', 'code'];
  protected bankNameTerms = ['name', 'bank_name', 'naam', 'bank_naam'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];
}

// 7. Austria Importer
export class AustriaImporter extends AbstractCountryImporter {
  countryCode = 'AT';
  countryName = 'Austria';
  detectTerms = ['bankleitzahlen_at', 'oenb', 'blz_at'];
  protected bankCodeTerms = ['blz', 'bankleitzahl', 'code', 'bank_code'];
  protected bankNameTerms = ['bankname', 'name', 'bezeichnung', 'institut'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];
}

// 8. Portugal Importer
export class PortugalImporter extends AbstractCountryImporter {
  countryCode = 'PT';
  countryName = 'Portugal';
  detectTerms = ['banco_de_portugal', 'codigo_banque_pt'];
  protected bankCodeTerms = ['codigo', 'bank_code', 'code'];
  protected bankNameTerms = ['nome', 'banco', 'designacao', 'name'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];
}

// 9. Luxembourg Importer
export class LuxembourgImporter extends AbstractCountryImporter {
  countryCode = 'LU';
  countryName = 'Luxembourg';
  detectTerms = ['cssf', 'lux_banks'];
  protected bankCodeTerms = ['code', 'bank_code', 'lux_code'];
  protected bankNameTerms = ['nom', 'name', 'bank_name', 'denomination'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];
}

// 10. Ireland Importer
export class IrelandImporter extends AbstractCountryImporter {
  countryCode = 'IE';
  countryName = 'Ireland';
  detectTerms = ['nsc', 'sort_code_ie', 'irish_banks'];
  protected bankCodeTerms = ['nsc', 'sort_code', 'code', 'bank_code'];
  protected bankNameTerms = ['bank_name', 'name', 'institution_name'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];
}

// 11. Finland Importer
export class FinlandImporter extends AbstractCountryImporter {
  countryCode = 'FI';
  countryName = 'Finland';
  detectTerms = ['suomen_pankki', 'finnish_banks'];
  protected bankCodeTerms = ['code', 'bank_code', 'tunnus'];
  protected bankNameTerms = ['name', 'bank_name', 'pankki', 'nimi'];
  protected bicTerms = ['bic', 'swift', 'swift_code'];
}

/**
 * Registry of all available importers
 */
export class ImporterRegistry {
  private static instance: ImporterRegistry;
  private importers: Map<string, Importer> = new Map();

  private constructor() {
    this.register(new GermanyImporter());
    this.register(new SpainImporter());
    this.register(new FranceImporter());
    this.register(new BelgiumImporter());
    this.register(new ItalyImporter());
    this.register(new NetherlandsImporter());
    this.register(new AustriaImporter());
    this.register(new PortugalImporter());
    this.register(new LuxembourgImporter());
    this.register(new IrelandImporter());
    this.register(new FinlandImporter());
  }

  public static getInstance(): ImporterRegistry {
    if (!ImporterRegistry.instance) {
      ImporterRegistry.instance = new ImporterRegistry();
    }
    return ImporterRegistry.instance;
  }

  public register(importer: Importer): void {
    this.importers.set(importer.countryCode.toUpperCase(), importer);
  }

  public getImporter(countryCode: string): Importer | null {
    return this.importers.get(countryCode.toUpperCase()) || null;
  }

  public getAllImporters(): Importer[] {
    return Array.from(this.importers.values());
  }

  /**
   * Smart-detects the matching country importer based on headers
   */
  public detectImporter(headers: string[]): Importer | null {
    for (const importer of this.importers.values()) {
      if (importer.detect(headers)) {
        return importer;
      }
    }
    return null;
  }
}
