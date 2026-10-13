import { handleCloudflareRequest } from '../../_adapter';
import paymentProofUrlHandler from '../../../api/admin/payment-proof-url';

export const onRequest = (context: any) => handleCloudflareRequest(context, paymentProofUrlHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
