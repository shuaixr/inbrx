import os from 'node:os';
import path from 'node:path';

const APP_DIR_NAME = 'inbrx';

export function getDefaultDataDir(platform = process.platform, env = process.env): string {
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', APP_DIR_NAME);
  }

  if (platform === 'win32') {
    return path.join(env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), APP_DIR_NAME);
  }

  return path.join(env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), APP_DIR_NAME);
}
