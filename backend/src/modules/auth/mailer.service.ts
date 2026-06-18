import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: Transporter;
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly configService: ConfigService) {
    this.transporter = createTransport({
      host: configService.get<string>('MAIL_HOST', 'sandbox.smtp.mailtrap.io'),
      port: parseInt(configService.get<string>('MAIL_PORT', '2525'), 10),
      auth: {
        user: configService.get<string>('MAIL_USER'),
        pass: configService.get<string>('MAIL_PASS'),
      },
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  async sendInvoice(to: string, factura: { numero: string; empresa?: { nombre?: string; email?: string }; cliente?: { nombre?: string }; total?: number | string }, pdfBuffer: Buffer): Promise<void> {
    const safeName    = this.escapeHtml(factura.cliente?.nombre ?? 'Cliente');
    const safeNumero  = this.escapeHtml(factura.numero);
    const safeEmpresa = this.escapeHtml(factura.empresa?.nombre ?? 'Empresa');
    const total = Number(factura.total ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fromEmail = factura.empresa?.email || this.configService.get('MAIL_FROM', 'noreply@facturacion.com');

    await this.transporter.sendMail({
      from: `"${safeEmpresa}" <${fromEmail}>`,
      to,
      subject: `Factura ${safeNumero} — ${safeEmpresa}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
          <div style="background:#111827;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;">${safeEmpresa}</h1>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
            <h2 style="margin-top:0;">Hola, ${safeName}</h2>
            <p style="color:#6b7280;">Adjuntamos la factura <strong>${safeNumero}</strong> por un total de <strong>$${total}</strong>.</p>
            <p style="color:#6b7280;">Podés encontrar el documento PDF adjunto a este email.</p>
            <p style="color:#9ca3af;font-size:13px;margin-top:24px;">Si tenés alguna consulta, respondé este email.</p>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `${safeNumero}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  async sendPasswordReset(to: string, nombre: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3004');
    const url = `${frontendUrl}/recuperar-contrasena/${token}`;
    const safeName = this.escapeHtml(nombre);

    await this.transporter.sendMail({
      from: `"Sistema de Facturación" <${this.configService.get('MAIL_FROM', 'noreply@facturacion.com')}>`,
      to,
      subject: 'Recuperar contraseña — Sistema de Facturación',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
          <div style="background:#111827;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;">Sistema de Facturación</h1>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
            <h2 style="margin-top:0;">Hola, ${safeName}</h2>
            <p style="color:#6b7280;">Recibimos una solicitud para restablecer tu contraseña.</p>
            <p style="color:#6b7280;">Hacé click en el siguiente botón. El link expira en <strong>1 hora</strong>.</p>
            <a href="${url}"
               style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
              Restablecer contraseña
            </a>
            <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
              Si no solicitaste esto, podés ignorar este email.
            </p>
          </div>
        </body>
        </html>
      `,
    });
  }
}
