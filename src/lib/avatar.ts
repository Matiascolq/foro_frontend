import { api } from "./api";

const avatarCache: Record<number, string | null> = {};

export async function getAvatar(userId: number): Promise<string | null> {
  if (avatarCache[userId] !== undefined) {
    return avatarCache[userId];
  }

  try {
    const profile = await api.getProfile(userId);
    const url = profile?.avatar ?? null;
    avatarCache[userId] = url;
    return url;
  } catch (err) {
    console.error("⚠️ Error obteniendo avatar:", err);
    avatarCache[userId] = null;
    return null;
  }
}
