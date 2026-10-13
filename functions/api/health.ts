import { handleCloudflareRequest } from '../_adapter';
import healthHandler from '../../api/health';

export const onRequest = (context: any) => handleCloudflareRequest(context, healthHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
