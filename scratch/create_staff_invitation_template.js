const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function createStaffInvitationTemplate() {
    console.log('=== CREACIÓN DE PLANTILLA CANÓNICA /email_templates/staff_invitation ===');

    const templateData = {
        templateId: "staff_invitation",
        version: 1,
        name: "Personal — Invitación y Activación de Cuenta",
        description: "Invitación formal enviada a colaboradores de comercio para activar su cuenta y configurar contraseña.",
        audience: "MERCHANT",
        eventType: "STAFF_INVITATION_SENT",
        subject: "Has sido invitado a formar parte de {{businessName}} — {{platformName}}",
        title: "¡Te damos la bienvenida al equipo de {{businessName}}!",
        htmlContent: `
          <p>Hola <strong>{{employeeName}}</strong>,</p>
          <p>Has sido invitado por la administración de <strong>{{businessName}}</strong> para integrarte a su equipo operativo en la plataforma oficial de <strong>{{platformName}}</strong>.</p>
          <div style="background-color: #0F172A; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
            <h3 style="color: #38BDF8; font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase;">Detalles de la Posición</h3>
            <p style="margin: 6px 0; font-size: 13px; color: #CBD5E1;"><strong>Comercio:</strong> {{businessName}}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #CBD5E1;"><strong>Sucursal:</strong> {{branchName}}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #CBD5E1;"><strong>Rol Asignado:</strong> <span style="background-color: #1E293B; padding: 2px 8px; border-radius: 4px; color: #38BDF8; font-weight: 700; border: 1px solid #475569;">{{roleTitle}}</span></p>
            <p style="margin: 6px 0; font-size: 13px; color: #CBD5E1;"><strong>Correo de Acceso:</strong> {{email}}</p>
          </div>
          <p>Para comenzar a operar, por favor activa tu cuenta personal y define tu contraseña de acceso seguro pulsando el botón a continuación:</p>
          <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #334155;">
            <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 600;">ENLACE DIRECTO (Si el botón no funciona):</p>
            <p style="margin: 6px 0 0 0; font-size: 12px; color: #38BDF8; word-break: break-all; font-family: monospace;">{{activationLink}}</p>
          </div>
          <p style="color: #94A3B8; font-size: 12px; line-height: 1.5;">
            ⚠ Por motivos de seguridad, este enlace es de un solo uso y expirará en 72 horas.
          </p>
        `.trim(),
        buttonLabel: "Activar mi Cuenta",
        buttonUrl: "{{activationLink}}",
        allowedVariables: [
            "employeeName",
            "businessName",
            "branchName",
            "roleTitle",
            "email",
            "activationLink",
            "platformName",
            "tenantName",
            "supportEmail",
            "year"
        ],
        status: "ACTIVE",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: "SYSTEM_MIGRATION_STAFF_AUTH"
    };

    const docRef = db.collection('email_templates').doc('staff_invitation');
    await docRef.set(templateData, { merge: true });
    console.log('✅ Documento /email_templates/staff_invitation creado exitosamente en Firestore.');

    // Verificar lectura con EmailTemplateEngine
    process.env.NODE_ENV = 'production';
    process.env.GCP_PROJECT = 'bluesystem-7c9af';
    const { EmailTemplateEngine } = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/lib/services/emailService');
    const resolved = await EmailTemplateEngine.resolveTemplate('staff_invitation');
    console.log('✅ EmailTemplateEngine resolvió la plantilla con éxito:', resolved.name, `(Version: ${resolved.version})`);
}

createStaffInvitationTemplate().catch(console.error);
