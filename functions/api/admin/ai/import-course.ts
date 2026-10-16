import { handleCloudflareRequest } from '../../../_adapter';
import importCourseHandler from '../../../../api/admin/ai/import-course';

export const onRequest = (context: any) => handleCloudflareRequest(context, importCourseHandler);
export const onRequestPost = onRequest;
export const onRequestOptions = onRequest;
