/**
 * Maps Controller — secure Google Maps proxy endpoints.
 */

import { Request, Response } from 'express';
import {
  findNearbyPlaces,
  getFastestRoute,
  reverseGeocode,
  searchAddressCandidates,
} from '../services/maps/index.js';

export const getNearbyPlaces = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as Record<string, string | undefined>;

  const places = await findNearbyPlaces({
    lat: Number(query.lat),
    lng: Number(query.lng),
    type: query.type as 'doctor' | 'hospital' | 'pharmacy',
    radius: Number(query.radius ?? 4000),
    limit: Number(query.limit ?? 10),
    search: query.search,
    specialty: query.specialty,
    language: query.language,
  });

  res.json({ places });
};

export const getAddressCandidates = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as Record<string, string | undefined>;

  const candidates = await searchAddressCandidates({
    query: String(query.query ?? ''),
    limit: Number(query.limit ?? 5),
    language: query.language,
  });

  res.json({ candidates });
};

export const getReverseGeocode = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as Record<string, string | undefined>;

  const candidate = await reverseGeocode({
    lat: Number(query.lat),
    lng: Number(query.lng),
    language: query.language,
  });

  res.json({ candidate });
};

export const getRouteEstimate = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as Record<string, string | undefined>;

  const route = await getFastestRoute({
    originLat: Number(query.originLat),
    originLng: Number(query.originLng),
    destinationLat: Number(query.destinationLat),
    destinationLng: Number(query.destinationLng),
    mode: (query.mode as 'driving' | 'walking') ?? 'driving',
    language: query.language,
  });

  res.json({ route });
};
