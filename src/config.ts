export interface TpConfig {
  token: string;
  baseUrl: string;
  ownerId?: number;
  teamId?: number;
}

export function loadConfig(): TpConfig {
  const token = process.env.TP_TOKEN;
  const baseUrl = process.env.TP_BASE_URL;
  if (!token) throw new Error("TP_TOKEN env var is required");
  if (!baseUrl) throw new Error("TP_BASE_URL env var is required");

  const ownerId = process.env.TP_OWNER_ID ? Number(process.env.TP_OWNER_ID) : undefined;
  const teamId = process.env.TP_TEAM_ID ? Number(process.env.TP_TEAM_ID) : undefined;

  return {
    token,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    ownerId: Number.isFinite(ownerId) ? ownerId : undefined,
    teamId: Number.isFinite(teamId) ? teamId : undefined,
  };
}
