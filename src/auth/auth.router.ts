import { Router } from 'express';
import {
  createUserController,
  loginUserController,
  getAllUsersController,
  getUserByIdController,
  updateUserByIdController,
  deactivateUserController,
} from './auth.controller';
import { adminRoleAuth, userRoleAuth, bothRoleAuth } from '../middleware/bearAuth';

const AuthRouter = Router();

// Public routes (no authentication required)
AuthRouter.post('/register', createUserController);
AuthRouter.post('/login', loginUserController);

AuthRouter.use(bothRoleAuth); // Applies to all routes below

AuthRouter.use(adminRoleAuth); // All routes below require admin role

AuthRouter.get('/users', getAllUsersController);
AuthRouter.get('/users/:id', getUserByIdController);
AuthRouter.put('/users/:id', updateUserByIdController);
AuthRouter.post('/users/:id/deactivate', deactivateUserController);

export default AuthRouter;