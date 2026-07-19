export type ConnectionSettings = {
  smtpHost: string;
  smtpPort: number;
  smtpStartTls: boolean;
  smtpAuth: 'optional';
};

export async function fetchConnectionSettings(): Promise<ConnectionSettings> {
  const response = await fetch('/api/connection');
  if (!response.ok) {
    throw new Error(`Failed to load connection settings (${response.status})`);
  }

  const data = (await response.json()) as { connection: ConnectionSettings };
  return data.connection;
}
