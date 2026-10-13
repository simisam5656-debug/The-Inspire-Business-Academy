import { handleCloudflareRequest } from '../../../_adapter';
import adminAiHandler from '../../../../api/admin/ai/generate';

export const onRequest = (context: any) => handleCloudflareRequest(context, adminAiHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
