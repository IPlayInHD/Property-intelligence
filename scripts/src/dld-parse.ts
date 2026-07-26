/**
 * Pure parsing/mapping helpers for DLD open-data transaction CSVs.
 * Extracted so both the importer (import-dld.ts) and the self-test can use them
 * with no database or filesystem dependency.
 */
import crypto from "node:crypto";
import { canonicalCommunity } from "./community-map.js";

export const SQM_TO_SQFT = 10.7639;

/** CSV line → fields, handling quoted fields that contain commas. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

export const norm = (s: string) => s.replace(/^﻿/, "").trim().toUpperCase().replace(/[\s_]+/g, "");

export function findCol(headers: string[], candidates: string[]): number {
  const H = headers.map(norm);
  for (const c of candidates) { const i = H.indexOf(norm(c)); if (i >= 0) return i; }
  return -1;
}

export function parseRooms(v: string): number | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (s.includes("studio")) return 0;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function parseDate(v: string): string | null {
  if (!v) return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function mapType(v: string): string {
  const s = (v || "").trim().toLowerCase();
  if (s.includes("flat")) return "Apartment";
  if (s.includes("villa")) return "Villa";
  if (s.includes("town")) return "Townhouse";
  if (s.includes("shop")) return "Shop";
  if (s.includes("office")) return "Office";
  if (s.includes("penthouse")) return "Penthouse";
  return v ? v.trim() : "Unknown";
}

export const num = (v: string) => { const n = parseFloat((v || "").replace(/[^0-9.]/g, "")); return isNaN(n) ? null : n; };

export interface ColMap { group: number; date: number; area: number; project: number; type: number; rooms: number; size: number; value: number; txno: number; }

export function detectColumns(headers: string[]): ColMap {
  return {
    group: findCol(headers, ["GROUP_EN", "GROUP"]),
    date: findCol(headers, ["INSTANCE_DATE", "TRANSACTION_DATE", "DATE"]),
    area: findCol(headers, ["AREA_EN", "AREA", "COMMUNITY"]),
    project: findCol(headers, ["PROJECT_EN", "MASTER_PROJECT_EN", "BUILDING_NAME_EN", "BUILDING"]),
    type: findCol(headers, ["PROP_SB_TYPE_EN", "PROP_TYPE_EN", "PROPERTY_TYPE"]),
    rooms: findCol(headers, ["ROOMS_EN", "ROOMS"]),
    size: findCol(headers, ["ACTUAL_AREA", "PROCEDURE_AREA", "AREA_SIZE", "SIZE"]),
    value: findCol(headers, ["TRANS_VALUE", "ACTUAL_WORTH", "AMOUNT", "PRICE"]),
    txno: findCol(headers, ["TRANSACTION_NUMBER", "TRANSACTION_ID"]),
  };
}

export interface MappedTx {
  transactionId: string; community: string; buildingName: string | null; propertyType: string | null;
  bedrooms: number | null; sizeSqft: number | null; salePrice: number; pricePerSqft: number | null;
  transactionDate: string; emirate: string; floorNumber: number | null;
}

/** Map one CSV row to a transaction, or null if it should be skipped. */
export function mapRow(fields: string[], col: ColMap, opts: { areaUnit: string; groupFilter: string; emirate: string }): MappedTx | null {
  if (col.group >= 0 && opts.groupFilter && !(fields[col.group] || "").toLowerCase().includes(opts.groupFilter)) return null;

  const salePrice = num(fields[col.value] ?? "");
  const rawSize = col.size >= 0 ? num(fields[col.size] ?? "") : null;
  const sizeSqft = rawSize != null ? +(opts.areaUnit === "sqm" ? rawSize * SQM_TO_SQFT : rawSize).toFixed(2) : null;
  const transactionDate = parseDate(fields[col.date] ?? "");
  const rawArea = (fields[col.area] || "").trim();
  const community = canonicalCommunity(rawArea); // DLD area name → canonical community
  if (!salePrice || !transactionDate || !community) return null;

  const pricePerSqft = sizeSqft && sizeSqft > 0 ? +(salePrice / sizeSqft).toFixed(2) : null;
  const bedrooms = col.rooms >= 0 ? parseRooms(fields[col.rooms] ?? "") : null;
  const buildingName = col.project >= 0 ? (fields[col.project] || "").trim() || null : null;
  const propertyType = col.type >= 0 ? mapType(fields[col.type] ?? "") : null;
  const idBasis = `${col.txno >= 0 ? fields[col.txno] : ""}|${transactionDate}|${community}|${buildingName}|${propertyType}|${sizeSqft}|${salePrice}`;
  const transactionId = crypto.createHash("sha1").update(idBasis).digest("hex").slice(0, 40);

  return { transactionId, community, buildingName, propertyType, bedrooms, sizeSqft, salePrice, pricePerSqft, transactionDate, emirate: opts.emirate, floorNumber: null };
}
