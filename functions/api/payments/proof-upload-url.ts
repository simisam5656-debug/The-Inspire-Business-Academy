import { handleCloudflareRequest } from '../../_adapter';
import proofUploadUrlHandler from '../../../api/payments/proof-upload-url';

export const onRequest = (context: any) => handleCloudflareRequest(context, proofUploadUrlHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
