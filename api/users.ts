import { put, list } from '@vercel/blob';

export const config = {
  runtime: 'node',
};

const USERS_FILE = 'users.json';

export default async function handler(request: any, response: any) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return response.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  try {
    // 1. Get existing users
    let users = [];
    const { blobs } = await list({ token });
    const userBlob = blobs.find((b: any) => b.pathname === USERS_FILE);

    if (userBlob) {
      const res = await fetch(userBlob.url);
      if (res.ok) {
        users = await res.json();
      }
    } else {
      // Default admin if no file exists
      users = [{ username: 'admin', password: 'admin123', role: 'admin' }];
    }

    // GET: Return users
    if (request.method === 'GET') {
      return response.status(200).json(users);
    }

    // POST: Update users
    if (request.method === 'POST') {
      const body = request.body; // Vercel parses JSON body automatically
      
      // Overwrite the user list
      const newUsers = body; 
      
      const blob = await put(USERS_FILE, JSON.stringify(newUsers), { 
        access: 'public',
        addRandomSuffix: false, // Keep the filename constant
        token
      });

      return response.status(200).json({ success: true, url: blob.url });
    }

    return response.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error(error);
    return response.status(500).json({ error: error.message || 'Unknown error' });
  }
}