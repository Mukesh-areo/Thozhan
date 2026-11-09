// POST {} — a driver asks for a UPI payment link for their outstanding day fees.
// With RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET set this creates a Razorpay Payment Link. Without
// them it works only in local dev (THOZHAN_DEV=1), returning the dev server's test-payment page.
import { HttpError, endpoint, json, requireUser } from '../_shared/http.ts';

export const handler = endpoint(async (req, ctx) => {
  const driver = await requireUser(req, ctx);
  const payment = await ctx.rpc<{
    id: string;
    amountPaise: number;
    phone: string;
    name: string | null;
  }>('fee_payment_create_internal', {
    p_driver: driver,
  });
  const keyId = ctx.env('RAZORPAY_KEY_ID');
  const keySecret = ctx.env('RAZORPAY_KEY_SECRET');

  if (!keyId || !keySecret) {
    if (ctx.env('THOZHAN_DEV') !== '1') throw new HttpError('payments_not_configured', 503);
    const url = `${ctx.env('THOZHAN_PUBLIC_URL') ?? ''}/dev/pay/${payment.id}`;
    await ctx.rpc('fee_payment_link_internal', {
      p_payment: payment.id,
      p_link_id: `dev_${payment.id}`,
      p_url: url,
    });
    return json({
      paymentId: payment.id,
      amountPaise: payment.amountPaise,
      url,
      mode: 'test',
    });
  }

  const res = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      amount: payment.amountPaise,
      currency: 'INR',
      reference_id: payment.id,
      description: 'Thozhan day fee',
      customer: {
        name: payment.name ?? 'Thozhan driver',
        contact: '+' + payment.phone.replace(/^\+/, ''),
      },
      notify: { sms: true },
      expire_by: Math.floor(Date.now() / 1000) + 24 * 3600,
    }),
  });
  if (!res.ok) {
    console.error('razorpay', res.status, await res.text());
    throw new HttpError('payment_provider_error', 502);
  }
  const link = (await res.json()) as { id: string; short_url: string };
  await ctx.rpc('fee_payment_link_internal', {
    p_payment: payment.id,
    p_link_id: link.id,
    p_url: link.short_url,
  });
  return json({
    paymentId: payment.id,
    amountPaise: payment.amountPaise,
    url: link.short_url,
    mode: 'live',
  });
});
