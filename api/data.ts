import { handleUpload } from '@vercel/blob/client';
import { list } from '@vercel/blob';

export const config = {
  runtime: 'nodejs',
};

const DATA_FILE = 'main-data.json';

export default async function handler(request: any, response: any) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return response.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  // GET: Redirect to the actual Blob URL for downloading data
  // We do this to find the dynamic URL if needed, though with addRandomSuffix: false it's cleaner.
  if (request.method === 'GET') {
    try {
        const { blobs } = await list({ token });
        const dataBlob = blobs.find((b: any) => b.pathname === DATA_FILE);

        if (!dataBlob) {
            return response.status(404).json({ error: 'Data not found' });
        }

        // Fetch the data server-side to avoid CORS or just return URL?
        // Returning JSON content directly is safer for the app logic
        const res = await fetch(dataBlob.url);
        if (!res.ok) throw new Error('Failed to fetch blob');
        
        const data = await res.json();
        return response.status(200).json(data);

    } catch (e: any) {
        return response.status(500).json({ error: e.message || 'Unknown error' });
    }
  }

  // POST: Generate a client upload token (for handling large files > 4.5MB)
  if (request.method === 'POST') {
    const body = request.body;

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          // Only allow uploading main-data.json
          if (pathname !== DATA_FILE) {
            throw new Error('Invalid filename. Only main-data.json allowed.');
          }
          return {
            allowedContentTypes: ['application/json'],
            tokenPayload: JSON.stringify({
              userId: 'admin', // In real app, verify session here
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('Blob upload completed', blob, tokenPayload);
        },
      });

      return response.status(200).json(jsonResponse);
    } catch (error: any) {
      return response.status(400).json({ error: error.message || 'Upload failed' });
    }
  }

  return response.status(405).json({ error: 'Method not allowed' });
}
