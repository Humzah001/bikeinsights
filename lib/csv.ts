import fs from "fs/promises";
import Papa from "papaparse";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export async function readCSV<T>(filename: string): Promise<T[]> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const result = Papa.parse<T>(content, {
      header: true,
      skipEmptyLines: true,
    });
    return result.data;
  } catch {
    return [];
  }
}

export async function writeCSV<T>(filename: string, data: T[]): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  await fs.mkdir(DATA_DIR, { recursive: true });
  const csv = Papa.unparse(data);
  await fs.writeFile(filePath, csv, "utf-8");
}

export async function appendCSV<T>(filename: string, row: T): Promise<void> {
  const existing = await readCSV<T>(filename);
  await writeCSV(filename, [...existing, row]);
}
