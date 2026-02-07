import { handleUpload } from '@vercel/blob/client';
import { list, del } from '@vercel/blob';

export const config = {
  runtime: 'nodejs',
};

const DATA_FILE_PREFIX = 'data_v';

export default async function handler(request: any, response: any) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return response.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  // GET: Find latest data
  if (request.method === 'GET') {
    // 1. HEADERS: Force no-cache
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    response.setHeader('Surrogate-Control', 'no-store');

    try {
        const { type } = request.query;

        // 2. LIST: Get all blobs
        const { blobs } = await list({ token });

        const dataFiles = blobs
            .filter((b: any) => b.pathname.startsWith(DATA_FILE_PREFIX) && b.pathname.endsWith('.zip'))
            .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

        const latestFile = dataFiles[0];

        // 3. CLEANUP: Delete old files
        if (dataFiles.length > 1) {
            const filesToDelete = dataFiles.slice(1).map((b: any) => b.url);
            if (filesToDelete.length > 0) {
                 del(filesToDelete, { token }).catch(console.error);
            }
        }

        // Handle: No data exists yet
        if (!latestFile) {
            if (type === 'version' || type === 'metadata') return response.status(200).json({ timestamp: 0, url: null });
            return response.status(404).json({ error: 'Data not found' });
        }

        // Extract timestamp
        const match = latestFile.pathname.match(/data_v(\d+)\.zip/);
        const versionTimestamp = match ? parseInt(match[1]) : new Date(latestFile.uploadedAt).getTime();
        
        // 4. RESPONSE
        // Instead of redirecting (which fails on some mobile fetch implementations),
        // we return the Direct Download URL and Metadata.
        
        const cacheBustUrl = `${latestFile.url}?cb=${Date.now()}`;
        
        return response.status(200).json({ 
            timestamp: versionTimestamp,
            url: cacheBustUrl,
            filename: latestFile.pathname
        });

    } catch (e: any) {
        console.error("API Error:", e);
        return response.status(500).json({ error: e.message || 'Unknown error' });
    }
  }

  // POST: Upload
  if (request.method === 'POST') {
    const body = request.body;

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          if (!pathname.startsWith(DATA_FILE_PREFIX) || !pathname.endsWith('.zip')) {
             throw new Error('Invalid filename format. Must be data_v{timestamp}.zip');
          }
          return {
            allowedContentTypes: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
            tokenPayload: JSON.stringify({ userId: 'admin' }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('New data version uploaded:', blob.pathname);
        },
      });

      return response.status(200).json(jsonResponse);
    } catch (error: any) {
      return response.status(400).json({ error: error.message || 'Upload failed' });
    }
  }

  return response.status(405).json({ error: 'Method not allowed' });
}