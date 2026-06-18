import { Router } from 'express';
import * as sevaController from '../controllers/seva.controller.js';

const router = Router();

// Chat endpoint - no auth required (works for both authenticated and anonymous)
router.post('/chat', sevaController.chat);

export default router;
