/**
 * Every `schemas/*.schema.json` validates fixtures named `{basename}.(valid|invalid).*.json`.
 */
import { describe, it, expect } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasDir = join(__dirname, '..', 'schemas');
const fixturesDir = join(__dirname, '..', 'fixtures');

const SCHEMA_FILES = [
  'action.schema.json',
  'message.schema.json',
  'events.schema.json',
  'approval.schema.json',
  'settings.schema.json',
];

function loadSchema(name: string): object {
  return JSON.parse(readFileSync(join(schemasDir, name), 'utf8'));
}

function validateFixtures(schemaFile: string): void {
  const base = basename(schemaFile, '.schema.json');
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);

  const loadOrder =
    schemaFile === 'events.schema.json'
      ? ['action.schema.json', 'message.schema.json', 'events.schema.json']
      : schemaFile === 'message.schema.json'
        ? ['action.schema.json', 'message.schema.json']
        : [schemaFile];

  for (const f of loadOrder) {
    ajv.addSchema(loadSchema(f));
  }

  const validate = ajv.getSchema(`https://mayra.local/contracts/${base}.schema.json`);
  if (!validate) {
    throw new Error(`No compiled schema for ${base}`);
  }

  const all = readdirSync(fixturesDir).filter((n) => n.startsWith(`${base}.`) && n.endsWith('.json'));

  const valid = all.filter((n) => n.includes('.valid.'));
  const invalid = all.filter((n) => n.includes('.invalid.'));

  expect(valid.length, `${base}: expected at least one valid fixture`).toBeGreaterThan(0);
  expect(invalid.length, `${base}: expected at least one invalid fixture`).toBeGreaterThan(0);

  it.each(valid)(`${base} accepts %s`, (name) => {
    const data = JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
    const ok = validate(data);
    expect(ok, JSON.stringify(validate.errors)).toBe(true);
  });

  it.each(invalid)(`${base} rejects %s`, (name) => {
    const data = JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
    const ok = validate(data);
    expect(ok).toBe(false);
  });
}

describe('contract JSON Schemas', () => {
  for (const schemaFile of SCHEMA_FILES) {
    describe(schemaFile, () => {
      validateFixtures(schemaFile);
    });
  }
});
