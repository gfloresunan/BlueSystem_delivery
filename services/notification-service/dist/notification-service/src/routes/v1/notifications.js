"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fcm_1 = require("../../providers/fcm");
const email_1 = require("../../providers/email");
const sms_1 = require("../../providers/sms");
const whatsapp_1 = require("../../providers/whatsapp");
const router = (0, express_1.Router)();
router.post("/send", async (req, res) => {
    const { channel, recipient, title, body, template, data } = req.body;
    try {
        switch (channel) {
            case "push": {
                const tokens = Array.isArray(recipient) ? recipient : [recipient];
                const result = await fcm_1.FcmProvider.sendMulticast(tokens, title, body, data);
                return res.json({ channel: "push", ...result });
            }
            case "email": {
                const result = await email_1.EmailProvider.sendTransactionalEmail(recipient, title, body);
                return res.json({ channel: "email", ...result });
            }
            case "sms": {
                const result = await sms_1.SmsProvider.sendSms(recipient, body);
                return res.json({ channel: "sms", ...result });
            }
            case "whatsapp": {
                const result = await whatsapp_1.WhatsAppProvider.sendWhatsAppTemplate(recipient, template || "order_update", data || {});
                return res.json({ channel: "whatsapp", ...result });
            }
            default:
                return res.status(400).json({ error: `Channel '${channel}' is not supported.` });
        }
    }
    catch (e) {
        return res.status(500).json({ error: e.message || "Failed to dispatch notification." });
    }
});
exports.default = router;
