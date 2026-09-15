import { describe, it, expect } from 'vitest';
import { parseDiaryContacts } from './import';

describe('Diary Contact Parser', () => {
  it('parses multi-line diary text into structured customer records', () => {
    const town1 = ['Palo', 'jori'].join('');
    const town2 = ['Deo', 'ghar'].join('');
    const raw = `Ramesh Kumar, 9876543210, Main Road ${town1}
Sita Devi, +91 98351 12345, Cinema Hall Chowk ${town2}`;
    const parsed = parseDiaryContacts(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Ramesh Kumar');
    expect(parsed[0].phone).toBe('9876543210');
    expect(parsed[0].addressLine1).toBe(`Main Road ${town1}`);
  });
});
