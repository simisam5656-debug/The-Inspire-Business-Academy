import { handleCloudflareRequest } from '../../_adapter';
import calculateHandler from '../../../api/payments/calculate';

export const onRequest = (context: any) => handleCloudflareRequest(context, calculateHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
