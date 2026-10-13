import { handleCloudflareRequest } from '../../_adapter';
import rejectPaymentHandler from '../../../api/admin/reject-payment';

export const onRequest = (context: any) => handleCloudflareRequest(context, rejectPaymentHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
