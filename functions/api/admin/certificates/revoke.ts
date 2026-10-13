import { handleCloudflareRequest } from '../../../_adapter';
import revokeCertificateHandler from '../../../../api/admin/certificates/revoke';

export const onRequest = (context: any) => handleCloudflareRequest(context, revokeCertificateHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
