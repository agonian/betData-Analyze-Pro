import { put, list } from '@vercel/blob';

export const config = {
  runtime: 'nodejs',
};

const USERS_FILE = 'users.json';

// Helper to get fresh data from Blob
async function getFreshUsers(token: string) {
  try {
    const { blobs } = await list({ token });
    const userBlob = blobs.find((b: any) => b.pathname === USERS_FILE);

    if (userBlob) {
      // CRITICAL: cache: 'no-store' ensures we always fetch the latest version from Blob storage
      // bypassing Vercel's edge cache which causes the "can't login" issue.
      const res = await fetch(userBlob.url, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    }
    // Default admin if no file exists
    return [{ username: 'admin', password: 'admin123', role: 'admin' }];
  } catch (e) {
    console.error("Error reading users blob:", e);
    return [{ username: 'admin', password: 'admin123', role: 'admin' }];
  }
}

export default async function handler(request: any, response: any) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return response.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  try {
    // GET: Return users (Always fresh)
    if (request.method === 'GET') {
      const users = await getFreshUsers(token);
      
      // Set headers to prevent browser/CDN caching of the API response
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return response.status(200).json(users);
    }

    // POST: Handle Actions (Register, Update, Delete)
    // Moving logic here prevents "Race Conditions" where users disappear.
    if (request.method === 'POST') {
      const { action, user, username, users: fullList } = request.body;
      
      // Fetch current state from server (Single Source of Truth)
      let currentUsers = await getFreshUsers(token);
      let updatedUsers = [...currentUsers];
      let success = false;
      let message = "";

      // Legacy support: If full list is sent (mostly for simple migration/init), overwrite carefully
      if (fullList && Array.isArray(fullList)) {
         updatedUsers = fullList;
         success = true;
      } 
      // ACTION: REGISTER / ADD
      else if (action === 'register' || action === 'add') {
         if (updatedUsers.find((u: any) => u.username === user.username)) {
            return response.status(400).json({ success: false, message: 'Kullanıcı adı zaten var.' });
         }
         updatedUsers.push(user);
         success = true;
      }
      // ACTION: UPDATE
      else if (action === 'update') {
         const index = updatedUsers.findIndex((u: any) => u.username === user.username);
         if (index !== -1) {
             updatedUsers[index] = { ...updatedUsers[index], ...user };
             success = true;
         } else {
             return response.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
         }
      }
      // ACTION: DELETE
      else if (action === 'delete') {
         const initialLength = updatedUsers.length;
         updatedUsers = updatedUsers.filter((u: any) => u.username !== username);
         success = updatedUsers.length < initialLength;
      }

      if (success) {
        // Save back to Blob
        const blob = await put(USERS_FILE, JSON.stringify(updatedUsers), { 
            access: 'public',
            addRandomSuffix: false, // Keep the filename constant
            token,
            // Ensure write doesn't cache
            cacheControlMaxAge: 0 
        });
        
        return response.status(200).json({ success: true, url: blob.url });
      } else {
        return response.status(400).json({ success: false, message: 'İşlem gerçekleştirilemedi.' });
      }
    }

    return response.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error("API Handler Error:", error);
    return response.status(500).json({ error: error.message || 'Unknown error' });
  }
}