import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { roleEnum } from "../drizzle/schema";

// Define JWT payload type matching your schema
interface JwtPayload {
    sub: string;
    user_id: number;
    fullname: string;
    email: string;
    role: typeof roleEnum.enumValues[number]; // 'admin' | 'user'
    exp: number;
}

export const checkRoles = (requiredRole: "admin" | "user" | "both") => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Unauthorized - No token provided" });
            return;
        }

        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET as string;

        if (!secret) {
            res.status(500).json({ message: "Server configuration error" });
            return;
        }

        try {
            const decoded = jwt.verify(token, secret) as JwtPayload;
            (req as any).user = decoded; // Attach user to request object

            // Check if user is active (if this info is in your JWT)
            // If not, you might need to query the database here

            // Role verification
            switch (requiredRole) {
                case "both":
                    if (decoded.role === "admin" || decoded.role === "user") {
                        return next();
                    }
                    break;
                case "admin":
                case "user":
                    if (decoded.role === requiredRole) {
                        return next();
                    }
                    break;
            }

            res.status(403).json({ 
                message: `Forbidden - Requires ${requiredRole} role`,
                requiredRole,
                userRole: decoded.role
            });
            
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                res.status(401).json({ message: "Token expired" });
            } else if (error instanceof jwt.JsonWebTokenError) {
                res.status(401).json({ message: "Invalid token" });
            } else {
                res.status(401).json({ message: "Authentication failed" });
            }
        }
    };
};

// Specific role middlewares
export const adminRoleAuth = checkRoles("admin");
export const userRoleAuth = checkRoles("user");
export const bothRoleAuth = checkRoles("both");

// Optional: Enhanced role checker with permissions
export const checkPermissions = (requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Implement permission checking logic here
        // You might want to query the database for user permissions
        next();
    };
};