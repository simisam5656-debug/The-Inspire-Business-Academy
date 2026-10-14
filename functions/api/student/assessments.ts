import { handleCloudflareRequest } from '../../_adapter';
import handler from '../../../api/student/assessments';

export const onRequest = (context: any) => handleCloudflareRequest(context, handler);
export const onRequestPost = onRequest;
export const onRequestOptions = onRequest;
