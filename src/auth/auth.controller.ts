import { Request, Response } from "express";
import { 
    createUserService, 
    getUserByEmailService, 
    userLoginService, 
    getAllUsersService, 
    updateUserByIdService, 
    getUserByIdService,
    deactivateUserService
} from "./auth.service";
import bcrypt from "bcryptjs";
import "dotenv/config";
import jwt from "jsonwebtoken";
import { sendEmail } from "../config/mailer";

// Create a user controller
export const createUserController = async (req: Request, res: Response) => {
    try {
        console.log("Registration request received:", { body: req.body });
        
        const user = req.body;
        const password = user.password;
        
        console.log("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.isActive = true; // Set user as active by default

        console.log("Checking if user already exists...");
        const existingUser = await getUserByEmailService(user.email);
        if (existingUser) {
            console.log("User already exists:", user.email);
            return res.status(400).json({ message: "User already exists" });
        }

        console.log("Creating user in database...");
        const createdUser = await createUserService(user);
        console.log("User created successfully:", createdUser);
        
        // Send welcome email only if email configuration is available
        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            console.log("Email configuration found, sending welcome email...");
            try {
                await sendEmail(
                    user.email,
                    "Welcome to our platform",
                    `Hello ${user.fullname}, your account has been created successfully!`,
                    `<div>
                    <h2>Welcome ${user.fullname},</h2>
                    <p>Your account has been created successfully!</p>
                    <p>You can now log in and start using our services.</p>
                    </div>`
                );
                console.log("Welcome email sent successfully");
            } catch (emailError) {
                console.error("Failed to send welcome email:", emailError);
                // Don't fail the registration if email fails
            }
        } else {
            console.log("Email configuration not found, skipping welcome email");
        }

        console.log("Sending success response...");
        return res.status(201).json({ 
            message: "User created successfully",
            user: {
                id: createdUser.id,
                fullname: user.fullname,
                email: user.email,
                role: user.role || 'user'
            }
        });

    } catch (error: any) {
        console.error("Registration error:", error);
        return res.status(500).json({ error: error.message });
    }
};

// Login user controller
export const loginUserController = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Check if the user exists
        const user = await userLoginService(email, password);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ message: "Account is deactivated" });
        }

        // Verify the password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Create a payload
        const payload = {
            sub: user.id,
            user_id: user.id,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
        };

        // Generate the JWT token
        const secret = process.env.JWT_SECRET as string;
        if (!secret) {
            throw new Error("JWT_SECRET is not defined");
        }
        const token = jwt.sign(payload, secret);

        // Return the token with user info
        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                user_id: user.id,
                fullname: user.fullname,
                email: user.email,
                role: user.role
            }
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

// Get all users controller
export const getAllUsersController = async (req: Request, res: Response) => {
    try {
        const users = await getAllUsersService();
        return res.status(200).json(users);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

// Update user by id controller
export const updateUserByIdController = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userData = req.body;

    try {
        // Check if user exists
        const existingUser = await getUserByIdService(Number(id));
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Hash password if it's being updated
        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }

        await updateUserByIdService(Number(id), userData);
        return res.status(200).json({ message: "User updated successfully" });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

// Get user by id controller
export const getUserByIdController = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await getUserByIdService(Number(id));
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

// Deactivate user controller
export const deactivateUserController = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await getUserByIdService(Number(id));
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await deactivateUserService(Number(id));
        return res.status(200).json({ message: "User deactivated successfully" });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};