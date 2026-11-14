import Papa from 'papaparse';
export interface ParsedCsv { headers: string[]; rows: Record<string, string>[]; }
export function parseCsv(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => Papa.parse<Record<string,string>>(file, {
    header:true, skipEmptyLines:true, dynamicTyping:false,
    complete: result => resolve({ headers: result.meta.fields ?? [], rows: result.data }),
    error: error => reject(error)
  }));
}
