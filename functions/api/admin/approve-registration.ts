import { handleCloudflareRequest } from '../../_adapter';
import approveRegistrationHandler from '../../../api/admin/approve-registration';

export const onRequest = (context: any) => handleCloudflareRequest(context, approveRegistrationHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
