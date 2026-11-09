// Edge function handlers by name, for the local dev server and tests.
import type { Handler } from './_shared/http.ts';
import { handler as feePaymentLink } from './fee-payment-link/handler.ts';
import { handler as finishTrip } from './finish-trip/handler.ts';
import { handler as razorpayWebhook } from './razorpay-webhook/handler.ts';
import { handler as syncMeter } from './sync-meter/handler.ts';

export const FUNCTIONS: Readonly<Record<string, Handler>> = {
  'finish-trip': finishTrip,
  'sync-meter': syncMeter,
  'fee-payment-link': feePaymentLink,
  'razorpay-webhook': razorpayWebhook,
};
