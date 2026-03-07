import fs from "fs/promises";
import Papa from "papaparse";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

/** On Vercel (and similar serverless), the filesystem is read-only. Writes will fail. */
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

export class CSVWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CSVWriteError";
  }
}

export async function writeCSV<T>(filename: string, data: T[]): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const csv = Papa.unparse(data);
    await fs.writeFile(filePath, csv, "utf-8");
  } catch (err) {
    const ro = err instanceof Error && "code" in err &&
      ((err as NodeJS.ErrnoException).code === "EACCES" || (err as NodeJS.ErrnoException).code === "EROFS");
    if (ro || process.env.VERCEL) {
      throw new CSVWriteError(
        "Cannot write to CSV: deployment environment (e.g. Vercel) uses a read-only filesystem. Use a database or persistent storage for production."
      );
    }
    throw err;
  }
}

export async function appendCSV<T>(filename: string, row: T): Promise<void> {
  const existing = await readCSV<T>(filename);
  await writeCSV(filename, [...existing, row]);
}
