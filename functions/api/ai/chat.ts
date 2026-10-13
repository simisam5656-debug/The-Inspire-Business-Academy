import { handleCloudflareRequest } from '../../_adapter';
import chatHandler from '../../../api/ai/chat';

export const onRequest = (context: any) => handleCloudflareRequest(context, chatHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
