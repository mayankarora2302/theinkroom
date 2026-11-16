import { describe, expect, it } from 'vitest';
import { slugify } from '../src/utils/slug.js';

describe('slugify', () => {
  it('creates readable URL slugs', () => {
    expect(slugify('Fine-line Peony & Moth')).toBe('fine-line-peony-and-moth');
    expect(slugify('  Café   Botánico  ')).toBe('cafe-botanico');
  });
  it('never returns an empty slug', () => {
    expect(slugify('★★★')).toBe('tattoo');
  });
});
