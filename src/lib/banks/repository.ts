import { supabase, getSupabase } from '../supabase';
import { Bank, IbanCache } from './types';

export class BankRepository {
  private static instance: BankRepository;
  private isLocalFallback = false;

  private constructor() {
    // Check if we should use local storage fallback
    const sb = getSupabase();
    if (!sb || (sb as any).__isMock || (sb as any).toString() === '[MockSupabase]') {
      this.isLocalFallback = true;
    }
  }

  public static getInstance(): BankRepository {
    if (!BankRepository.instance) {
      BankRepository.instance = new BankRepository();
    }
    return BankRepository.instance;
  }

  /**
   * Helper to fetch local fallback storage data
   */
  private getLocalBanks(): Bank[] {
    try {
      const data = localStorage.getItem('local_banks_db');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error parsing local banks:', e);
      return [];
    }
  }

  private saveLocalBanks(banks: Bank[]): void {
    try {
      localStorage.setItem('local_banks_db', JSON.stringify(banks));
    } catch (e) {
      console.error('Error saving local banks:', e);
    }
  }

  private getLocalIbanCache(): IbanCache[] {
    try {
      const data = localStorage.getItem('local_iban_cache_db');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error parsing local IBAN cache:', e);
      return [];
    }
  }

  private saveLocalIbanCache(caches: IbanCache[]): void {
    try {
      localStorage.setItem('local_iban_cache_db', JSON.stringify(caches));
    } catch (e) {
      console.error('Error saving local IBAN cache:', e);
    }
  }

  /**
   * Fetch all banks
   */
  async getAllBanks(): Promise<Bank[]> {
    if (this.isLocalFallback) {
      return this.getLocalBanks();
    }

    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('country_code', { ascending: true })
        .order('bank_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase banks query failed, falling back to localStorage:', err);
      this.isLocalFallback = true;
      return this.getLocalBanks();
    }
  }

  /**
   * Fetch banks by country code
   */
  async getBanksByCountry(countryCode: string): Promise<Bank[]> {
    if (this.isLocalFallback) {
      return this.getLocalBanks().filter(
        b => b.country_code.toUpperCase() === countryCode.toUpperCase()
      );
    }

    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('country_code', countryCode.toUpperCase())
        .order('bank_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn(`Supabase filter by country failed for ${countryCode}, falling back:`, err);
      return this.getLocalBanks().filter(
        b => b.country_code.toUpperCase() === countryCode.toUpperCase()
      );
    }
  }

  /**
   * Find a specific bank by country and bank code
   */
  async findByCountryAndBankCode(countryCode: string, bankCode: string): Promise<Bank | null> {
    if (this.isLocalFallback) {
      const bank = this.getLocalBanks().find(
        b => b.country_code.toUpperCase() === countryCode.toUpperCase() && b.bank_code === bankCode
      );
      return bank || null;
    }

    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('country_code', countryCode.toUpperCase())
        .eq('bank_code', bankCode)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn(`Supabase find by code failed for ${countryCode}-${bankCode}, falling back:`, err);
      const bank = this.getLocalBanks().find(
        b => b.country_code.toUpperCase() === countryCode.toUpperCase() && b.bank_code === bankCode
      );
      return bank || null;
    }
  }

  /**
   * Clear all banks for a specific country (used when replacing/deleting dataset)
   */
  async deleteBanksByCountry(countryCode: string): Promise<void> {
    if (this.isLocalFallback) {
      const remaining = this.getLocalBanks().filter(
        b => b.country_code.toUpperCase() !== countryCode.toUpperCase()
      );
      this.saveLocalBanks(remaining);
      return;
    }

    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('country_code', countryCode.toUpperCase());

      if (error) throw error;
    } catch (err) {
      console.warn(`Supabase delete by country failed for ${countryCode}, using fallback:`, err);
      const remaining = this.getLocalBanks().filter(
        b => b.country_code.toUpperCase() !== countryCode.toUpperCase()
      );
      this.saveLocalBanks(remaining);
    }
  }

  /**
   * Bulk upsert banks with transactional feel
   * For database RLS or bulk API, we chunk writes (e.g. 100 rows per batch)
   */
  async bulkUpsertBanks(banks: Bank[], rollbackOnFailure = true): Promise<{ imported: number; updated: number; ignored: number }> {
    const report = { imported: 0, updated: 0, ignored: 0 };
    if (banks.length === 0) return report;

    if (this.isLocalFallback) {
      const local = this.getLocalBanks();
      const localMap = new Map<string, Bank>();
      local.forEach(b => localMap.set(`${b.country_code.toUpperCase()}-${b.bank_code}`, b));

      banks.forEach(newBank => {
        const key = `${newBank.country_code.toUpperCase()}-${newBank.bank_code}`;
        const existing = localMap.get(key);
        if (existing) {
          // If duplicate values are exactly the same, we might ignore them, or update them.
          // Let's implement actual duplicate check:
          const isSame = existing.bank_name === newBank.bank_name &&
                         existing.bic === newBank.bic &&
                         existing.city === newBank.city &&
                         existing.sepa_supported === newBank.sepa_supported;
          if (isSame) {
            report.ignored++;
          } else {
            Object.assign(existing, newBank, { updated_at: new Date().toISOString() });
            report.updated++;
          }
        } else {
          localMap.set(key, {
            ...newBank,
            id: local.length + report.imported + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          report.imported++;
        }
      });

      this.saveLocalBanks(Array.from(localMap.values()));
      return report;
    }

    // Supabase upload logic
    try {
      // Before upserting, we need to know what exists so we can calculate imported/updated/ignored rows correctly
      // Let's fetch existing codes for this country
      const countryCode = banks[0].country_code.toUpperCase();
      const existingBanks = await this.getBanksByCountry(countryCode);
      const existingMap = new Map<string, Bank>();
      existingBanks.forEach(b => existingMap.set(b.bank_code, b));

      const rowsToInsert: Bank[] = [];
      const rowsToUpdate: Bank[] = [];

      banks.forEach(newBank => {
        const existing = existingMap.get(newBank.bank_code);
        if (existing) {
          const isSame = existing.bank_name === newBank.bank_name &&
                         existing.bic === newBank.bic &&
                         existing.city === newBank.city &&
                         existing.sepa_supported === newBank.sepa_supported;
          if (isSame) {
            report.ignored++;
          } else {
            rowsToUpdate.push({
              ...existing,
              ...newBank,
              updated_at: new Date().toISOString()
            });
            report.updated++;
          }
        } else {
          rowsToInsert.push({
            ...newBank,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          report.imported++;
        }
      });

      const allOps = [...rowsToInsert, ...rowsToUpdate];
      if (allOps.length === 0) {
        return report;
      }

      // Chunk requests to avoid hitting Supabase size limits (100 rows per batch is safe)
      const chunkSize = 100;
      const originalState = [...existingBanks]; // Safe copy for potential rollback

      try {
        for (let i = 0; i < allOps.length; i += chunkSize) {
          const chunk = allOps.slice(i, i + chunkSize);
          const { error } = await supabase
            .from('banks')
            .upsert(chunk, { onConflict: 'country_code,bank_code' });
          if (error) throw error;
        }
      } catch (upsertErr) {
        if (rollbackOnFailure) {
          console.error('Upsert failed, initiating rollback to original state...', upsertErr);
          // Rollback: clear what was there and re-insert original
          await supabase.from('banks').delete().eq('country_code', countryCode);
          if (originalState.length > 0) {
            const cleanOriginals = originalState.map(({ id, ...rest }) => rest); // remove internal ID to let DB auto-assign or keep if needed
            for (let i = 0; i < cleanOriginals.length; i += chunkSize) {
              await supabase.from('banks').insert(cleanOriginals.slice(i, i + chunkSize));
            }
          }
        }
        throw upsertErr;
      }

      return report;
    } catch (err) {
      console.warn('Supabase bulk upsert failed, resorting to local fallback storage:', err);
      this.isLocalFallback = true;
      // retry with local fallback
      return this.bulkUpsertBanks(banks, false);
    }
  }

  /**
   * Get Cached IBAN info
   */
  async getIbanCache(iban: string): Promise<IbanCache | null> {
    const formattedIban = iban.replace(/\s+/g, '').toUpperCase();
    if (this.isLocalFallback) {
      const found = this.getLocalIbanCache().find(c => c.iban === formattedIban);
      return found || null;
    }

    try {
      const { data, error } = await supabase
        .from('iban_cache')
        .select('*')
        .eq('iban', formattedIban)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase cache lookup failed:', err);
      const found = this.getLocalIbanCache().find(c => c.iban === formattedIban);
      return found || null;
    }
  }

  /**
   * Save IBAN to cache
   */
  async insertIbanCache(cache: IbanCache): Promise<void> {
    const formattedIban = cache.iban.replace(/\s+/g, '').toUpperCase();
    const entry = { ...cache, iban: formattedIban, cached_at: new Date().toISOString() };

    if (this.isLocalFallback) {
      const caches = this.getLocalIbanCache();
      const filtered = caches.filter(c => c.iban !== formattedIban);
      filtered.push({ ...entry, id: caches.length + 1 });
      this.saveLocalIbanCache(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('iban_cache')
        .insert([entry]);

      if (error) throw error;
    } catch (err) {
      console.warn('Supabase cache insertion failed, writing locally:', err);
      const caches = this.getLocalIbanCache();
      const filtered = caches.filter(c => c.iban !== formattedIban);
      filtered.push({ ...entry, id: caches.length + 1 });
      this.saveLocalIbanCache(filtered);
    }
  }
}
