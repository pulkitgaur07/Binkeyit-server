import { Router } from 'express';
import auth from '../middleware/auth.js';
import { AddCategoryController, DeleteCategorycontroller, GetCategoryController, UpdateCategoryController } from '../controllers/category.controller.js';

const categoryRouter = Router();

categoryRouter.post('/add-category',auth,AddCategoryController);
categoryRouter.get('/get',GetCategoryController);
categoryRouter.put('/update',auth,UpdateCategoryController);
categoryRouter.delete('/delete',auth,DeleteCategorycontroller);

export default categoryRouter;