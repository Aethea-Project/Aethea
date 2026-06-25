import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  createReservationSchema,
  reservationAvailabilityAlertSchema,
  updateReservationStatusSchema,
} from '../schemas/index.js';
import {
  ReservationResponseSchema,
} from '../schemas/response.schemas.js';

// Extend Zod with OpenAPI properties
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// --- Security Schemes ---
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Provide your Supabase JWT bearer token to access protected routes.',
});

// --- Register Schemas ---
const CreateReservationSchemaOpenApi = registry.register(
  'CreateReservationRequest',
  createReservationSchema.openapi({
    description: 'Payload for booking a reservation appointment slot.',
  })
);

const UpdateReservationStatusSchemaOpenApi = registry.register(
  'UpdateReservationStatusRequest',
  updateReservationStatusSchema.openapi({
    description: 'Payload for a doctor to update a reservation status.',
  })
);

const ReservationAlertSchemaOpenApi = registry.register(
  'ReservationAlertRequest',
  reservationAvailabilityAlertSchema.openapi({
    description: 'Payload to subscribe to a slot availability notification.',
  })
);

const ReservationResponseSchemaOpenApi = registry.register(
  'ReservationResponse',
  ReservationResponseSchema.openapi({
    description: 'Standard safe reservation object returned by the API.',
  })
);

// --- Register Routes ---

// GET /api/v1/reservations
registry.registerPath({
  method: 'get',
  path: '/api/v1/reservations',
  summary: 'List user reservations',
  description: 'Retrieve a paginated list of active/upcoming reservations for the authenticated patient.',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'page',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 1 },
      description: 'Page number for pagination',
    },
    {
      name: 'limit',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 20 },
      description: 'Number of items per page',
    },
  ],
  responses: {
    200: {
      description: 'Successful retrieval of reservation list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ReservationResponseSchemaOpenApi),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized — missing or invalid JWT bearer token' },
  },
});

// POST /api/v1/reservations
registry.registerPath({
  method: 'post',
  path: '/api/v1/reservations',
  summary: 'Book a reservation slot',
  description: 'Creates a new appointment booking for a specific doctor schedule slot.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateReservationSchemaOpenApi,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Reservation booked successfully',
      content: {
        'application/json': {
          schema: z.object({
            reservation: ReservationResponseSchemaOpenApi,
          }),
        },
      },
    },
    400: { description: 'Bad Request — invalid fields or slot already booked' },
    401: { description: 'Unauthorized' },
    409: { description: 'Conflict — duplicate request detected by idempotency middleware' },
  },
});

// DELETE /api/v1/reservations/{id}
registry.registerPath({
  method: 'delete',
  path: '/api/v1/reservations/{id}',
  summary: 'Cancel a reservation',
  description: 'Allows a patient to cancel their booked reservation prior to the 24-hour deadline.',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
      description: 'The UUID of the reservation to cancel',
    },
  ],
  responses: {
    204: {
      description: 'Reservation cancelled successfully',
    },
    400: { description: 'Bad Request — cancellation deadline has already passed' },
    401: { description: 'Unauthorized' },
    404: { description: 'Reservation not found' },
  },
});

// POST /api/v1/reservations/alerts
registry.registerPath({
  method: 'post',
  path: '/api/v1/reservations/alerts',
  summary: 'Subscribe to slot availability alerts',
  description: 'Registers interest in being notified in-app/via email when a slot becomes available on a full schedule.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ReservationAlertSchemaOpenApi,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Subscription registered successfully',
      content: {
        'application/json': {
          schema: z.object({
            subscribed: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    404: { description: 'Schedule not found' },
  },
});

// PATCH /api/v1/reservations/{id}/status
registry.registerPath({
  method: 'patch',
  path: '/api/v1/reservations/{id}/status',
  summary: 'Update reservation status (Doctor-only)',
  description: 'Allows an authenticated doctor to update a reservation status (e.g. complete, in_progress).',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
      description: 'The reservation UUID',
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateReservationStatusSchemaOpenApi,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Reservation status updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            reservation: ReservationResponseSchemaOpenApi,
          }),
        },
      },
    },
    400: { description: 'Bad Request — invalid status progression' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden — user is not the owning doctor of this schedule' },
  },
});

// --- Generator ---
export const getOpenApiDocumentation = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Aethea Platform API Documentation',
      description:
        'Production-grade, highly secure REST API built for modern health diagnostics and clinic reservation management. Features active Helmet CSP boundaries, fine-grained Edge caching, Zod output DTO serializers, and Redis-backed state-changing Idempotency.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
      {
        url: 'https://aethea.me',
        description: 'Production API Gateway',
      },
    ],
  });
};
export default getOpenApiDocumentation;
