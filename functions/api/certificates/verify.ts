import { handleCloudflareRequest } from '../../_adapter';
import verifyHandler from '../../../api/certificates/verify';

export const onRequest = (context: any) => handleCloudflareRequest(context, verifyHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
