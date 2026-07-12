import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getDefaultDataDir } from './data-dir.js';

describe('getDefaultDataDir', () => {
  it('uses Application Support on macOS', () => {
    expect(getDefaultDataDir('darwin')).toContain(path.join('Library', 'Application Support', 'inbrx'));
  });

  it('uses APPDATA on Windows', () => {
    expect(getDefaultDataDir('win32', { APPDATA: 'C:\\Users\\tester\\AppData\\Roaming' })).toBe(
      path.join('C:\\Users\\tester\\AppData\\Roaming', 'inbrx')
    );
  });

  it('uses XDG_DATA_HOME on Linux', () => {
    expect(getDefaultDataDir('linux', { XDG_DATA_HOME: '/tmp/xdg-data' })).toBe('/tmp/xdg-data/inbrx');
  });
});
