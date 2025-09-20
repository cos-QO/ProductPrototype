import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_production';
export const authUtils = {
    async hashPassword(password) {
        return await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 3,
            parallelism: 1,
        });
    },
    async verifyPassword(hash, password) {
        return await argon2.verify(hash, password);
    },
    generateToken(userId, email) {
        return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '24h' });
    },
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        }
        catch {
            return null;
        }
    },
    requireAuth(req, res, next) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = this.verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        req.user = decoded;
        next();
    }
};
export const registrationSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be less than 100 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Password must include uppercase, lowercase, number, and special character'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
});
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});
//# sourceMappingURL=auth.js.map