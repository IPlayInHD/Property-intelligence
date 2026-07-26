/**
 * Robust streaming CSV reader — quote-aware, handles fields that contain
 * commas, quotes, and embedded newlines (e.g. listing descriptions), and is
 * memory-safe for very large files (reads in chunks, yields one record at a time).
 */
import fs from "node:fs";

export async function* streamCsvRecords(path: string): AsyncGenerator<string[]> {
  const stream = fs.createReadStream(path, { encoding: "utf8" });
  let field = "", row: string[] = [], inQ = false, quoteClosed = false, any = false;

  for await (const chunk of stream as AsyncIterable<string>) {
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      any = true;
      if (quoteClosed) {
        quoteClosed = false;
        if (c === '"') { field += '"'; inQ = true; continue; } // "" escape → literal quote
        // otherwise fall through and handle c in unquoted mode
      }
      if (inQ) {
        if (c === '"') { inQ = false; quoteClosed = true; }
        else field += c;
        continue;
      }
      if (c === '"') { inQ = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); field = ""; yield row; row = []; }
      else if (c !== "\r") { field += c; }
    }
  }
  if (any && (field.length || row.length)) { row.push(field); yield row; }
}
