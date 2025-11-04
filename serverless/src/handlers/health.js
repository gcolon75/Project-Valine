import { json } from '../utils/headers.js';

export const handler = async () => {
  return json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'Project Valine API',
    version: '1.0.0'
  });
};
