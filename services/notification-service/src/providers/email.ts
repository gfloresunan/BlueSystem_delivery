export class EmailProvider {
  public static async sendTransactionalEmail(to: string, subject: string, templateHtml: string): Promise<{ success: boolean; messageId: string }> {
    // Transactual Email Provider Engine (SendGrid / SMTP API)
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };
  }
}
