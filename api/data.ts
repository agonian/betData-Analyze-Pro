import { handleUpload } from '@vercel/blob/client';
import { list, del } from '@vercel/blob';

export const config = {
  runtime: 'nodejs',
};

// We now look for files matching this pattern prefix
const DATA_FILE_PREFIX = 'data_v';

export default async function handler(request: any, response: any) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return response.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  // GET: Find latest data, return version or redirect to file
  if (request.method === 'GET') {
    // 1. HEADERS: Force no-cache everywhere
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    response.setHeader('Surrogate-Control', 'no-store');

    try {
        const { type } = request.query;

        // 2. LIST: Get all blobs to find the latest version
        const { blobs } = await list({ token });

        // Filter for our data files: data_v{timestamp}.zip
        // Sort by uploadedAt (descending) -> Newest first
        const dataFiles = blobs
            .filter((b: any) => b.pathname.startsWith(DATA_FILE_PREFIX) && b.pathname.endsWith('.zip'))
            .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

        const latestFile = dataFiles[0];

        // 3. CLEANUP: Delete old files asynchronously to save storage
        // We keep the latest one, delete the rest.
        if (dataFiles.length > 1) {
            const filesToDelete = dataFiles.slice(1).map((b: any) => b.url);
            // Fire and forget delete (don't await to keep response fast)
            if (filesToDelete.length > 0) {
                 del(filesToDelete, { token }).catch(console.error);
            }
        }

        // Handle: No data exists yet
        if (!latestFile) {
            if (type === 'version') return response.status(200).json({ timestamp: 0 });
            return response.status(404).json({ error: 'Data not found' });
        }

        // 4. RESPONSE: Version Info
        if (type === 'version') {
            // Extract timestamp from filename if possible, otherwise use upload time
            // Format: data_v1700000000000.zip
            const match = latestFile.pathname.match(/data_v(\d+)\.zip/);
            const versionTimestamp = match ? parseInt(match[1]) : new Date(latestFile.uploadedAt).getTime();
            
            return response.status(200).json({ timestamp: versionTimestamp });
        } 
        
        // 5. RESPONSE: Redirect to Download
        else {
            // Append random query param to ensure browser treats it as a fresh URL
            const cacheBustUrl = `${latestFile.url}?cb=${Date.now()}`;
            return response.redirect(cacheBustUrl);
        }

    } catch (e: any) {
        console.error("API Error:", e);
        return response.status(500).json({ error: e.message || 'Unknown error' });
    }
  }

  // POST: Generate Token for Upload
  if (request.method === 'POST') {
    const body = request.body;

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          // Allow dynamic filenames: data_v{number}.zip
          // We assume the client generates the name
          if (!pathname.startsWith(DATA_FILE_PREFIX) || !pathname.endsWith('.zip')) {
             throw new Error('Invalid filename format. Must be data_v{timestamp}.zip');
          }

          return {
            allowedContentTypes: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
            tokenPayload: JSON.stringify({
              userId: 'admin',
            }),
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