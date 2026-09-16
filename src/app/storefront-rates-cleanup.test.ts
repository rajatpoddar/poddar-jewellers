import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

describe('Public Metal Rates Cleanup', () => {
  it('should not have public rates page file', () => {
    const ratesPagePath = join(process.cwd(), 'src/app/rates/page.tsx');
    const storeRatesPagePath = join(process.cwd(), 'src/app/(store)/rates/page.tsx');
    expect(existsSync(ratesPagePath)).toBe(false);
    expect(existsSync(storeRatesPagePath)).toBe(false);
  });

  it('header navigation should not contain rates link', () => {
    const headerPath = existsSync(join(process.cwd(), 'src/components/layout/Header.tsx'))
      ? join(process.cwd(), 'src/components/layout/Header.tsx')
      : join(process.cwd(), 'src/components/store/Header.tsx');
    const content = readFileSync(headerPath, 'utf-8');
    expect(content).not.toContain('/rates');
  });

  it('homepage should not render DailyRatesStrip', () => {
    const homePath = existsSync(join(process.cwd(), 'src/app/page.tsx'))
      ? join(process.cwd(), 'src/app/page.tsx')
      : join(process.cwd(), 'src/app/(store)/page.tsx');
    const content = readFileSync(homePath, 'utf-8');
    expect(content).not.toContain('DailyRatesStrip');
  });

  it('redirects /rates to / with 301 in proxy', async () => {
    const req = new NextRequest('http://localhost:3000/rates');
    const res = await proxy(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });
});
