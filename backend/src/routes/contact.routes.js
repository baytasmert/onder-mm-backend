import express from 'express';
import * as contactController from '../controllers/contactController.js';
const router = express.Router();

router.post('/', contactController.submitContactForm);
router.get('/', contactController.getAllContactMessages);
router.get('/stats', contactController.getContactStats);
router.get('/:id', contactController.getContactMessage);
router.put('/:id/status', contactController.updateContactStatus);
router.post('/:id/notes', contactController.addContactNote);
router.delete('/:id', contactController.deleteContactMessage);

export default router;
