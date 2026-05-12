#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function toCsvRow(values) {
  return values
    .map((value) => {
      const text = String(value ?? "");
      if (text.includes('"') || text.includes(",") || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    })
    .join(",");
}

function normalizeCatalogText(raw) {
  let text = raw.replace(/\r?\n/g, " ");

  // Remove recurrent PDF header that appears inside lines.
  text = text.replace(/\b\d{1,3}\s+SKU SKU Description RRP EUR\b/gi, " ");
  text = text.replace(/\bSKU SKU Description RRP EUR\b/gi, " ");

  // Remove page number inserted between price and the next SKU.
  text = text.replace(/(\d+\.\d{2})\s+\d{1,3}\s+(?=\d{5,8}\b)/g, "$1 ");

  // Collapse repeated whitespace created by previous cleanup steps.
  return text.replace(/\s+/g, " ").trim();
}

function extractRows(normalizedText) {
  const records = [];
  const pattern = /(\d{5,8})\s+([\s\S]*?)\s+(\d+\.\d{2})(?=\s+\d{5,8}\b|$)/g;

  for (const match of normalizedText.matchAll(pattern)) {
    const [, sku, rawName, price] = match;
    const name = rawName.replace(/\s+/g, " ").trim();
    if (!name) continue;

    records.push({ sku, name, price });
  }

  return records;
}

function main() {
  const inputPath = resolve(process.argv[2] ?? "scripts/datisporchi.md");
  const outputPath = resolve(process.argv[3] ?? "scripts/datisporchi-clean.csv");

  const source = readFileSync(inputPath, "utf8");
  const normalized = normalizeCatalogText(source);
  const rows = extractRows(normalized);

  const csv = [
    toCsvRow(["sku", "name", "brand_id"]),
    ...rows.map((row) =>
      toCsvRow([row.sku, row.name, "33effb38-a665-4645-aa81-fadee5e6c486"])
    ),
  ].join("\n");

  writeFileSync(outputPath, csv, "utf8");

  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Rows:   ${rows.length}`);
}

main();
