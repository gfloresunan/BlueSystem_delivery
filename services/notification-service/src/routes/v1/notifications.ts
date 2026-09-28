import { Router, Request, Response } from "express";
import { FcmProvider } from "../../providers/fcm";
import { EmailProvider } from "../../providers/email";
import { SmsProvider } from "../../providers/sms";
import { WhatsAppProvider } from "../../providers/whatsapp";

const router = Router();

router.post("/send", async (req: Request, res: Response) => {
  const { channel, recipient, title, body, template, data } = req.body;

  try {
    switch (channel) {
      case "push": {
        const tokens = Array.isArray(recipient) ? recipient : [recipient];
        const result = await FcmProvider.sendMulticast(tokens, title, body, data);
        return res.json({ channel: "push", ...result });
      }
      case "email": {
        const result = await EmailProvider.sendTransactionalEmail(recipient, title, body);
        return res.json({ channel: "email", ...result });
      }
      case "sms": {
        const result = await SmsProvider.sendSms(recipient, body);
        return res.json({ channel: "sms", ...result });
      }
      case "whatsapp": {
        const result = await WhatsAppProvider.sendWhatsAppTemplate(recipient, template || "order_update", data || {});
        return res.json({ channel: "whatsapp", ...result });
      }
      default:
        return res.status(400).json({ error: `Channel '${channel}' is not supported.` });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to dispatch notification." });
  }
});

export default router;
