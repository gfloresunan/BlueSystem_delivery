import * as admin from "firebase-admin";

export class FcmProvider {
  public static async sendMulticast(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<{ successCount: number; failureCount: number }> {
    if (!tokens.length) return { successCount: 0, failureCount: 0 };

    const messaging = admin.messaging();
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: data || {},
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  }
}
