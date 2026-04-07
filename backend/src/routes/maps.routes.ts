/**
 * Maps Routes — authenticated secure proxy to maps services.
 */

import { Router, RequestHandler } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateQuery } from '../middleware/validate.js';
import { mapsProxyLimiter } from '../middleware/rateLimiter.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import {
  mapsFastestRouteQuerySchema,
  mapsGeocodeQuerySchema,
  mapsNearbyQuerySchema,
  mapsReverseGeocodeQuerySchema,
} from '../schemas/index.js';
import {
  getAddressCandidates,
  getNearbyPlaces,
  getReverseGeocode,
  getRouteEstimate,
} from '../controllers/maps.controller.js';

export const createMapsRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const auth = [
    authMiddleware,
    requireTrustedClaims,
    requireActiveAccount,
    requirePasswordChanged,
    requireLocalUser,
    mapsProxyLimiter,
  ];

  router.get('/nearby', auth, validateQuery(mapsNearbyQuerySchema), asyncHandler(getNearbyPlaces));
  router.get('/geocode', auth, validateQuery(mapsGeocodeQuerySchema), asyncHandler(getAddressCandidates));
  router.get('/reverse-geocode', auth, validateQuery(mapsReverseGeocodeQuerySchema), asyncHandler(getReverseGeocode));
  router.get('/route', auth, validateQuery(mapsFastestRouteQuerySchema), asyncHandler(getRouteEstimate));

  return router;
};
