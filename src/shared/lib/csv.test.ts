import { describe, it, expect } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('quotes every cell, escapes quotes and keeps leading zeros', () => {
    expect(toCsv(['IDoc', 'Note'], [['0000000001234567', 'Said "hi", then left'], [null, 42]])).toBe(
      '"IDoc","Note"\r\n"0000000001234567","Said ""hi"", then left"\r\n"","42"',
    );
  });
});
