import { handleUpload } from '@vercel/blob/client';
import { list } from '@vercel/blob';

export const config = {
  runtime: 'nodejs',
};

const DATA_FILE_ZIP = 'main-data.zip';
const VERSION_FILE = 'version.json';

export default async function handler(request: any, response: any) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return response.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  // GET: Fetch Data or Version
  if (request.method === 'GET') {
    // AGGRESSIVE CACHE BUSTING HEADERS
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    response.setHeader('Surrogate-Control', 'no-store');

    try {
        const { type } = request.query; // ?type=version or default (data)
        // Always fetch fresh list from Vercel Blob
        const { blobs } = await list({ token });

        if (type === 'version') {
            const versionBlob = blobs.find((b: any) => b.pathname === VERSION_FILE);
            if (!versionBlob) return response.status(200).json({ timestamp: 0 }); // No version yet
            
            // Bypass server-side fetch cache
            const res = await fetch(versionBlob.url, { cache: 'no-store' });
            const data = await res.json();
            return response.status(200).json(data);
        } 
        else {
            // Get the ZIP file URL
            const dataBlob = blobs.find((b: any) => b.pathname === DATA_FILE_ZIP);
            if (!dataBlob) return response.status(404).json({ error: 'Data not found' });
            
            // CRITICAL FIX FOR MOBILE:
            // Append a random query parameter to the BLOB URL itself.
            // This forces the browser to treat the redirect target as a new resource,
            // bypassing the browser's aggressive cache of the static file.
            const cacheBustUrl = `${dataBlob.url}?cb=${Date.now()}`;
            
            return response.redirect(cacheBustUrl);
        }

    } catch (e: any) {
        return response.status(500).json({ error: e.message || 'Unknown error' });
    }
  }

  // POST: Generate a client upload token
  if (request.method === 'POST') {
    const body = request.body;

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          // Allow both the zip file and the version file
          if (pathname !== DATA_FILE_ZIP && pathname !== VERSION_FILE) {
            throw new Error('Invalid filename. Only main-data.zip and version.json allowed.');
          }
          return {
            allowedContentTypes: ['application/zip', 'application/json', 'application/x-zip-compressed'],
            tokenPayload: JSON.stringify({
              userId: 'admin',
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('Blob upload completed', blob.pathname);
        },
      });

      return response.status(200).json(jsonResponse);
    } catch (error: any) {
      return response.status(400).json({ error: error.message || 'Upload failed' });
    }
  }

  return response.status(405).json({ error: 'Method not allowed' });
}