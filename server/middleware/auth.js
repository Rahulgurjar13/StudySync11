import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('[AUTH] No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('[AUTH] Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    console.log('[AUTH] Authenticated request for user:', user.email, 'ID:', user.id);
    req.user = user;
    next();
  });
};
