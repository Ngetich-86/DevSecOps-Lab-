import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextFunction, Request, Response } from 'express';

const rateLimiter = new RateLimiterMemory({
    points: 50,
    duration: 60
})

export const rateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await rateLimiter.consume(req.ip || 'unknown')
        console.log(`Rate limit check passed💚 for IP: ${req.ip}`);
        next()
    } catch (error) {
        res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
}
