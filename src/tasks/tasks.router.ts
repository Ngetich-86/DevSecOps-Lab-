import express from 'express';
import { TaskController } from './tasks.controller';
import { bothRoleAuth } from '../middleware/bearAuth';

const router = express.Router();
const taskController = new TaskController();

// Apply authentication middleware to all task routes
router.use(bothRoleAuth);

// Use bind() method to preserve context and cast to unknown first
router.get('/', taskController.getAllTasks.bind(taskController) as unknown as express.RequestHandler);
router.get('/due/today', taskController.getTasksDueToday.bind(taskController) as unknown as express.RequestHandler);
router.get('/overdue', taskController.getOverdueTasks.bind(taskController) as unknown as express.RequestHandler);
router.get('/status/:status', taskController.getTasksByStatus.bind(taskController) as unknown as express.RequestHandler);
router.get('/priority/:priority', taskController.getTasksByPriority.bind(taskController) as unknown as express.RequestHandler);
router.get('/:id', taskController.getTaskById.bind(taskController) as unknown as express.RequestHandler);
router.post('/', taskController.createTask.bind(taskController) as unknown as express.RequestHandler);
router.put('/:id', taskController.updateTask.bind(taskController) as unknown as express.RequestHandler);
router.patch('/:id/complete', taskController.toggleTaskCompletion.bind(taskController) as unknown as express.RequestHandler);
router.delete('/:id', taskController.deleteTask.bind(taskController) as unknown as express.RequestHandler);

export default router;