import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class LoginAttemptsService {
  private readonly map = new Map<string, { count: number; since: number }>();

  check(ip: string): void {
    const entry = this.map.get(ip);
    if (!entry) return;
    if (Date.now() - entry.since > WINDOW_MS) { this.map.delete(ip); return; }
    if (entry.count >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Demasiados intentos fallidos. Intentá nuevamente en 15 minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  increment(ip: string): void {
    const now = Date.now();
    const entry = this.map.get(ip);
    if (!entry || now - entry.since > WINDOW_MS) {
      this.map.set(ip, { count: 1, since: now });
    } else {
      entry.count++;
    }
  }

  reset(ip: string): void {
    this.map.delete(ip);
  }
}
