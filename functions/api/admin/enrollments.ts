import { handleCloudflareRequest } from '../../_adapter';
import enrollmentsHandler from '../../../api/admin/enrollments';

export const onRequest = (context: any) => handleCloudflareRequest(context, enrollmentsHandler);
export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
