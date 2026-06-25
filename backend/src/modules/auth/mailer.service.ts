import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly resend: Resend | null;
  private readonly transporter: nodemailer.Transporter | null;
  private readonly logger = new Logger(MailerService.name);
  private readonly from: string;
  private readonly simulate: boolean;

  constructor(private readonly configService: ConfigService) {
    const resendKey = configService.get<string>('RESEND_API_KEY');
    const mailHost  = configService.get<string>('MAIL_HOST');

    this.from = configService.get<string>('MAIL_FROM', 'noreply@facturacion.com');

    if (resendKey) {
      this.resend      = new Resend(resendKey);
      this.transporter = null;
      this.simulate    = false;
    } else if (mailHost) {
      this.resend      = null;
      this.transporter = nodemailer.createTransport({
        host: mailHost,
        port: configService.get<number>('MAIL_PORT', 587),
        auth: {
          user: configService.get<string>('MAIL_USER'),
          pass: configService.get<string>('MAIL_PASS'),
        },
      });
      this.simulate = false;
    } else {
      this.resend      = null;
      this.transporter = null;
      this.simulate    = true;
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private async send(options: { to: string; subject: string; html: string; attachments?: { filename: string; content: Buffer }[] }): Promise<void> {
    if (this.simulate) {
      this.logger.log(`[SIMULADO] → ${options.to} | ${options.subject}`);
      return;
    }

    if (this.resend) {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
      });
      if (error) this.logger.warn(`Resend error → ${options.to}: ${error.message}`);
      return;
    }

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          attachments: options.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Nodemailer error → ${options.to}: ${msg}`);
      }
    }
  }

  async sendInvoice(
    to: string,
    factura: {
      numero: string;
      empresa?: { nombre?: string; email?: string };
      cliente?: { nombre?: string };
      total?: number | string;
    },
    pdfBuffer: Buffer,
  ): Promise<void> {
    const safeName    = this.escapeHtml(factura.cliente?.nombre ?? 'Cliente');
    const safeNumero  = this.escapeHtml(factura.numero);
    const safeEmpresa = this.escapeHtml(factura.empresa?.nombre ?? 'Empresa');
    const total = Number(factura.total ?? 0).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    await this.send({
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
      attachments: [{ filename: `${safeNumero}.pdf`, content: pdfBuffer }],
    });
  }

  async sendPasswordReset(to: string, nombre: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3004');
    const url = `${frontendUrl}/recuperar-contrasena/${token}`;
    const safeName = this.escapeHtml(nombre);

    await this.send({
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
