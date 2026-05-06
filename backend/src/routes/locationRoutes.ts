// @ts-nocheck
import { Router } from 'express';
import { getLocationReverse, getLocationSearch } from '../controllers/locationController.js';

const locationRoutes = Router();

locationRoutes.get('/locations/search', getLocationSearch);
locationRoutes.get('/locations/reverse', getLocationReverse);

export { locationRoutes };
