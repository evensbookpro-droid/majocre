import { BankRepository } from './repository';
import { ImporterRegistry } from './importers';
import { Bank, ImportReport } from './types';

export class BankImporterService {
  private static instance: BankImporterService;
  private repository: BankRepository;
  private registry: ImporterRegistry;

  private constructor() {
    this.repository = BankRepository.getInstance();
    this.registry = ImporterRegistry.getInstance();
  }

  public static getInstance(): BankImporterService {
    if (!BankImporterService.instance) {
      BankImporterService.instance = new BankImporterService();
    }
    return BankImporterService.instance;
  }

  /**
   * Robust CSV parsing utility supporting commas, semicolons, tabs, and nested quotes.
   */
  public parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    // Auto-detect delimiter from the first line
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';')) {
      delimiter = ';';
    } else if (firstLine.includes('\t')) {
      delimiter = '\t';
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      // Clean leading/trailing quotes and clean quotes escaping
      return result.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    };

    const headers = parseLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  /**
   * Validates if a CSV structure can be parsed for a specific country
   */
  public validateStructure(headers: string[], countryCode: string): { isValid: boolean; error?: string } {
    const importer = this.registry.getImporter(countryCode);
    if (!importer) {
      return { isValid: false, error: `No importer found for country: ${countryCode}` };
    }

    // Attempt to match with any row to see if normalization will succeed. Let's make a mock row:
    const testRow: Record<string, string> = {};
    headers.forEach(h => {
      testRow[h] = '123_test_value';
    });

    const normalized = importer.normalize(testRow);
    if (!normalized || !normalized.bank_code || !normalized.bank_name) {
      return { 
        isValid: false, 
        error: `CSV structure mismatch for ${importer.countryName}. Missing recognizable headers for Bank Code or Bank Name.` 
      };
    }

    return { isValid: true };
  }

  /**
   * Import banking dataset from CSV content
   */
  public async importDataset(
    countryCode: string,
    fileContent: string,
    replaceExisting: boolean,
    rollbackOnFailure = true
  ): Promise<ImportReport> {
    const startTime = performance.now();
    const errorsList: string[] = [];
    let importedRows = 0;
    let updatedRows = 0;
    let ignoredRows = 0;

    const importer = this.registry.getImporter(countryCode);
    if (!importer) {
      throw new Error(`Country ${countryCode} is not supported yet.`);
    }

    try {
      // 1. Parse CSV
      const { headers, rows } = this.parseCSV(fileContent);
      if (rows.length === 0) {
        throw new Error('The CSV file is empty.');
      }

      // 2. Validate structure
      const validation = this.validateStructure(headers, countryCode);
      if (!validation.isValid) {
        throw new Error(validation.error || 'CSV Structure validation failed.');
      }

      // 3. Normalize rows
      const normalizedBanks: Bank[] = [];
      rows.forEach((row, idx) => {
        try {
          const normalized = importer.normalize(row);
          if (normalized) {
            normalizedBanks.push(normalized);
          } else {
            errorsList.push(`Row ${idx + 2}: Failed to normalize due to empty required fields.`);
          }
        } catch (e: any) {
          errorsList.push(`Row ${idx + 2}: ${e.message || 'Unknown normalization error'}`);
        }
      });

      if (normalizedBanks.length === 0) {
        throw new Error('No valid rows could be extracted from the CSV file.');
      }

      // 4. Handle replacement
      if (replaceExisting) {
        await this.repository.deleteBanksByCountry(countryCode);
      }

      // 5. Bulk save
      const result = await this.repository.bulkUpsertBanks(normalizedBanks, rollbackOnFailure);
      importedRows = result.imported;
      updatedRows = result.updated;
      ignoredRows = result.ignored;

    } catch (err: any) {
      const executionTimeMs = Math.round(performance.now() - startTime);
      return {
        importedRows: 0,
        updatedRows: 0,
        ignoredRows: 0,
        errorsList: [err.message || 'Unknown import error'],
        executionTimeMs
      };
    }

    const executionTimeMs = Math.round(performance.now() - startTime);
    return {
      importedRows,
      updatedRows,
      ignoredRows,
      errorsList,
      executionTimeMs
    };
  }
}
