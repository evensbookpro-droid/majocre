import { BankRepository } from './repository';
import { Bank, IbanCache } from './types';

export interface IbanEnrichmentResult {
  iban: string;
  isValid: boolean;
  validationError?: string;
  countryCode?: string;
  countryName?: string;
  bankCode?: string | null;
  bankName?: string | null;
  bic?: string | null;
  city?: string | null;
  sepaSupported?: boolean;
  source: 'memory_cache' | 'database_cache' | 'banks_table' | 'external_api' | 'not_found';
  durationMs: number;
}

export interface LookupLog {
  timestamp: string;
  country: string;
  bank_code: string | null;
  cache_hit: boolean;
  database_hit: boolean;
  api_hit: boolean;
  lookup_duration: number;
}

export const COUNTRY_NAMES: Record<string, string> = {
  'AD': 'Andorra',
  'AT': 'Austria',
  'BE': 'Belgium',
  'BG': 'Bulgaria',
  'CH': 'Switzerland',
  'CY': 'Cyprus',
  'CZ': 'Czech Republic',
  'DE': 'Germany',
  'DK': 'Denmark',
  'EE': 'Estonia',
  'ES': 'Spain',
  'FI': 'Finland',
  'FR': 'France',
  'GB': 'United Kingdom',
  'GI': 'Gibraltar',
  'GR': 'Greece',
  'HR': 'Croatia',
  'HU': 'Hungary',
  'IE': 'Ireland',
  'IS': 'Iceland',
  'IT': 'Italy',
  'LI': 'Liechtenstein',
  'LT': 'Lithuania',
  'LU': 'Luxembourg',
  'LV': 'Latvia',
  'MC': 'Monaco',
  'MT': 'Malta',
  'NL': 'Netherlands',
  'NO': 'Norway',
  'PL': 'Poland',
  'PT': 'Portugal',
  'RO': 'Romania',
  'SE': 'Sweden',
  'SI': 'Slovenia',
  'SK': 'Slovakia',
  'SM': 'San Marino',
};

export class IBANValidator {
  public static normalize(iban: string): string {
    return iban.replace(/[\s\r\n\t]/g, '').toUpperCase();
  }

  public static validate(iban: string): { isValid: boolean; error?: string } {
    const normalized = this.normalize(iban);
    
    if (!normalized) {
      return { isValid: false, error: 'IBAN is empty' };
    }

    if (normalized.length < 15 || normalized.length > 34) {
      return { isValid: false, error: 'IBAN length must be between 15 and 34 characters' };
    }

    // Check country code format
    const countryCode = normalized.substring(0, 2);
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return { isValid: false, error: 'IBAN must start with a valid 2-letter country code' };
    }

    // Check check digits format
    const checkDigits = normalized.substring(2, 4);
    if (!/^[0-9]{2}$/.test(checkDigits)) {
      return { isValid: false, error: 'IBAN must have 2 check digits after country code' };
    }

    // Check if bban format is valid alphanumeric
    const bban = normalized.substring(4);
    if (!/^[A-Z0-9]+$/.test(bban)) {
      return { isValid: false, error: 'IBAN contains invalid alphanumeric characters' };
    }

    // Move first 4 characters to the end
    const rearranged = bban + countryCode + checkDigits;

    // Convert letters to numeric values
    let numericString = '';
    for (let i = 0; i < rearranged.length; i++) {
      const char = rearranged[i];
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) { // A-Z
        numericString += (code - 55).toString(); // A is 10, B is 11, etc.
      } else {
        numericString += char;
      }
    }

    // Modulo 97 using division fragment algorithm to avoid floating point issues
    let checksum = numericString.slice(0, 9);
    let fragment = numericString.slice(9);
    while (fragment.length > 0) {
      checksum = (parseInt(checksum, 10) % 97).toString() + fragment.slice(0, 7);
      fragment = fragment.slice(7);
    }
    
    const remainder = parseInt(checksum, 10) % 97;
    if (remainder !== 1) {
      return { isValid: false, error: 'IBAN checksum failed (MOD 97)' };
    }

    return { isValid: true };
  }
}

export interface IIbanParser {
  extractBankCode(iban: string): string | null;
}

export class GermanyIbanParser implements IIbanParser {
  // characters 5-12, length 8
  extractBankCode(iban: string): string | null {
    if (iban.length < 12) return null;
    return iban.substring(4, 12);
  }
}

export class SpainIbanParser implements IIbanParser {
  // characters 5-8, length 4
  extractBankCode(iban: string): string | null {
    if (iban.length < 8) return null;
    return iban.substring(4, 8);
  }
}

export class FranceIbanParser implements IIbanParser {
  // characters 5-9, length 5
  extractBankCode(iban: string): string | null {
    if (iban.length < 9) return null;
    return iban.substring(4, 9);
  }
}

export class BelgiumIbanParser implements IIbanParser {
  // characters 5-7, length 3
  extractBankCode(iban: string): string | null {
    if (iban.length < 7) return null;
    return iban.substring(4, 7);
  }
}

export class IBANParserFactory {
  private static parsers: Record<string, IIbanParser> = {
    'DE': new GermanyIbanParser(),
    'ES': new SpainIbanParser(),
    'FR': new FranceIbanParser(),
    'BE': new BelgiumIbanParser(),
  };

  public static registerParser(countryCode: string, parser: IIbanParser): void {
    this.parsers[countryCode.toUpperCase()] = parser;
  }

  public static getParser(countryCode: string): IIbanParser | null {
    return this.parsers[countryCode.toUpperCase()] || null;
  }
}

export class CacheService {
  private memoryCache = new Map<string, IbanEnrichmentResult>();
  private repository: BankRepository;
  private ttlMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  constructor(repository: BankRepository) {
    this.repository = repository;
  }

  public getMemoryCache(iban: string): IbanEnrichmentResult | null {
    const cleanIban = iban.replace(/[\s\r\n\t]/g, '').toUpperCase();
    return this.memoryCache.get(cleanIban) || null;
  }

  public setMemoryCache(iban: string, result: IbanEnrichmentResult): void {
    const cleanIban = iban.replace(/[\s\r\n\t]/g, '').toUpperCase();
    this.memoryCache.set(cleanIban, result);
  }

  public async getDatabaseCache(iban: string): Promise<IbanCache | null> {
    const cleanIban = iban.replace(/[\s\r\n\t]/g, '').toUpperCase();
    const cached = await this.repository.getIbanCache(cleanIban);
    if (!cached) return null;

    // Verify TTL
    if (cached.cached_at) {
      const cachedTime = new Date(cached.cached_at).getTime();
      const age = Date.now() - cachedTime;
      if (age > this.ttlMs) {
        console.log(`Database cache expired for IBAN: ${cleanIban}`);
        return null;
      }
    }
    return cached;
  }

  public async setDatabaseCache(iban: string, result: IbanEnrichmentResult): Promise<void> {
    const cleanIban = iban.replace(/[\s\r\n\t]/g, '').toUpperCase();
    const cacheEntry: IbanCache = {
      iban: cleanIban,
      country: result.countryName || result.countryCode || '',
      bank_code: result.bankCode || null,
      bank_name: result.bankName || null,
      bic: result.bic || null,
      city: result.city || null,
      sepa: result.sepaSupported !== undefined ? result.sepaSupported : true,
    };
    await this.repository.insertIbanCache(cacheEntry);
  }
}

export class LookupLogger {
  public static saveLog(log: LookupLog): void {
    try {
      const logsStr = localStorage.getItem('iban_lookup_logs') || '[]';
      const logs = JSON.parse(logsStr) as LookupLog[];
      // Keep only the last 200 logs
      logs.unshift(log);
      if (logs.length > 200) {
        logs.pop();
      }
      localStorage.setItem('iban_lookup_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('Error writing lookup log:', e);
    }
  }

  public static getLogs(): LookupLog[] {
    try {
      const logsStr = localStorage.getItem('iban_lookup_logs') || '[]';
      return JSON.parse(logsStr) as LookupLog[];
    } catch (e) {
      return [];
    }
  }

  public static clearLogs(): void {
    localStorage.removeItem('iban_lookup_logs');
  }
}

export interface IExternalBankDetails {
  bankName: string;
  bic: string;
  city?: string;
  sepaSupported?: boolean;
}

export class ExternalAPIService {
  private lastRequestTime = 0;
  private minIntervalMs = 1000; // rate limit: 1 req / sec

  public async lookupBankDetails(countryCode: string, bankCode: string): Promise<IExternalBankDetails | null> {
    const now = Date.now();
    if (now - this.lastRequestTime < this.minIntervalMs) {
      console.warn('External API call rate limited');
      return null;
    }
    this.lastRequestTime = now;
    return null;
  }
}

export class IBANLookupService {
  private static instance: IBANLookupService;
  private repository: BankRepository;
  private cacheService: CacheService;
  private apiService: ExternalAPIService;

  private constructor(
    repository: BankRepository,
    cacheService: CacheService,
    apiService: ExternalAPIService
  ) {
    this.repository = repository;
    this.cacheService = cacheService;
    this.apiService = apiService;
  }

  public static getInstance(): IBANLookupService {
    if (!IBANLookupService.instance) {
      const repository = BankRepository.getInstance();
      const cacheService = new CacheService(repository);
      const apiService = new ExternalAPIService();
      IBANLookupService.instance = new IBANLookupService(repository, cacheService, apiService);
    }
    return IBANLookupService.instance;
  }

  public async lookup(iban: string): Promise<IbanEnrichmentResult> {
    const startTime = performance.now();
    const normalized = IBANValidator.normalize(iban);
    
    // Immediate country detection
    const countryCode = normalized.substring(0, 2);
    const countryName = COUNTRY_NAMES[countryCode] || countryCode;

    // Validate
    const validation = IBANValidator.validate(normalized);
    if (!validation.isValid) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        iban: normalized,
        isValid: false,
        validationError: validation.error,
        countryCode: countryCode.length === 2 ? countryCode : undefined,
        countryName: countryCode.length === 2 ? countryName : undefined,
        source: 'not_found',
        durationMs
      };
    }

    // Try extracting bank code
    const parser = IBANParserFactory.getParser(countryCode);
    const bankCode = parser ? parser.extractBankCode(normalized) : null;

    // Check Level 1: Memory cache
    const memCached = this.cacheService.getMemoryCache(normalized);
    if (memCached) {
      const durationMs = Math.round(performance.now() - startTime);
      LookupLogger.saveLog({
        timestamp: new Date().toISOString(),
        country: countryName,
        bank_code: bankCode,
        cache_hit: true,
        database_hit: false,
        api_hit: false,
        lookup_duration: durationMs
      });
      return { ...memCached, durationMs };
    }

    // Check Level 2: Database cache (iban_cache table)
    let cacheHit = false;
    let databaseHit = false;
    let apiHit = false;
    let resultSource: IbanEnrichmentResult['source'] = 'not_found';
    
    let enrichedData: Partial<IbanEnrichmentResult> = {};

    try {
      const dbCached = await this.cacheService.getDatabaseCache(normalized);
      if (dbCached) {
        cacheHit = true;
        resultSource = 'database_cache';
        enrichedData = {
          bankCode: dbCached.bank_code,
          bankName: dbCached.bank_name,
          bic: dbCached.bic,
          city: dbCached.city,
          sepaSupported: dbCached.sepa,
        };
      } else {
        // Search in primary banks table
        if (bankCode) {
          const bank = await this.repository.findByCountryAndBankCode(countryCode, bankCode);
          if (bank) {
            databaseHit = true;
            resultSource = 'banks_table';
            enrichedData = {
              bankCode: bank.bank_code,
              bankName: bank.bank_name,
              bic: bank.bic,
              city: bank.city,
              sepaSupported: bank.sepa_supported,
            };
          }
        }

        // If not found in primary banks table, try External API as last resort
        if (!enrichedData.bankName && bankCode) {
          const extDetails = await this.apiService.lookupBankDetails(countryCode, bankCode);
          if (extDetails) {
            apiHit = true;
            resultSource = 'external_api';
            enrichedData = {
              bankCode,
              bankName: extDetails.bankName,
              bic: extDetails.bic,
              city: extDetails.city,
              sepaSupported: extDetails.sepaSupported ?? true,
            };
          }
        }
      }
    } catch (e) {
      console.error('Error during database/API lookup:', e);
    }

    const durationMs = Math.round(performance.now() - startTime);

    const finalResult: IbanEnrichmentResult = {
      iban: normalized,
      isValid: true,
      countryCode,
      countryName,
      bankCode: enrichedData.bankCode ?? bankCode,
      bankName: enrichedData.bankName ?? null,
      bic: enrichedData.bic ?? null,
      city: enrichedData.city ?? null,
      sepaSupported: enrichedData.sepaSupported ?? true,
      source: resultSource,
      durationMs
    };

    // Store in caches if we actually found something
    if (finalResult.bankName) {
      this.cacheService.setMemoryCache(normalized, finalResult);
      if (!cacheHit) {
        try {
          await this.cacheService.setDatabaseCache(normalized, finalResult);
        } catch (cacheErr) {
          console.warn('Failed to save to database cache:', cacheErr);
        }
      }
    }

    // Save logs
    LookupLogger.saveLog({
      timestamp: new Date().toISOString(),
      country: countryName,
      bank_code: bankCode,
      cache_hit: cacheHit,
      database_hit: databaseHit,
      api_hit: apiHit,
      lookup_duration: durationMs
    });

    return finalResult;
  }
}
