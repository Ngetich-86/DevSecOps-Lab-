import express from 'express';
import { CategoryController } from './category.controller';
import { bothRoleAuth } from '../middleware/bearAuth';

const router = express.Router();
const categoryController = new CategoryController();

// Apply authentication middleware to all category routes
router.use(bothRoleAuth);

// Category CRUD routes
router.get('/', categoryController.getAllCategories.bind(categoryController) as unknown as express.RequestHandler);
router.get('/:id', categoryController.getCategoryById.bind(categoryController) as unknown as express.RequestHandler);
router.post('/', categoryController.createCategory.bind(categoryController) as unknown as express.RequestHandler);
router.put('/:id', categoryController.updateCategory.bind(categoryController) as unknown as express.RequestHandler);
router.delete('/:id', categoryController.deleteCategory.bind(categoryController) as unknown as express.RequestHandler);

export default router;
