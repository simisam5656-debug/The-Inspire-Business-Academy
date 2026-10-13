import { handleCloudflareRequest } from '../../../_adapter';
import issueCertificateHandler from '../../../../api/admin/certificates/issue';

export const onRequest = (context: any) => handleCloudflareRequest(context, issueCertificateHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
