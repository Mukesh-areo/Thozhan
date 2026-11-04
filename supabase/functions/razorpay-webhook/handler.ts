// Razorpay webhook for `payment_link.paid`. The body is checked against the
// X-Razorpay-Signature HMAC before anything is trusted. Deploy with --no-verify-jwt.
import { HttpError, endpoint, json } from '../_shared/http.ts';

export async function signature(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface Event {
  event: string;
  payload: {
    payment_link?: { entity: { reference_id: string; amount_paid: number } };
    payment?: { entity: { id: string; amount: number } };
  };
}

export const handler = endpoint(async (req, ctx) => {
  const secret = ctx.env('RAZORPAY_WEBHOOK_SECRET');
  if (!secret) throw new HttpError('payments_not_configured', 503);
  const raw = await req.text();
  const given = req.headers.get('x-razorpay-signature') ?? '';
  if (!equal(given, await signature(secret, raw))) throw new HttpError('bad_signature', 401);

  const event = JSON.parse(raw) as Event;
  if (event.event !== 'payment_link.paid') return json({ ok: true, ignored: event.event });
  const link = event.payload.payment_link?.entity;
  const payment = event.payload.payment?.entity;
  if (!link || !payment) throw new HttpError('bad_request');
  const result = await ctx.rpc('fee_payment_paid_internal', {
    p_payment: link.reference_id,
    p_provider_payment_id: payment.id,
    p_amount: link.amount_paid ?? payment.amount,
  });
  return json(result);
});
