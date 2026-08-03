import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '../config/env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Guchhi API',
      version: '1.0.0',
      description:
        'REST API for Guchhi — a premium Himalayan wild-foraged food ecommerce platform. ' +
        'Covers authentication, catalog, cart, checkout, Razorpay payments, orders, reviews, wishlist, coupons and admin operations.',
      contact: { name: 'Guchhi Engineering' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}${env.API_PREFIX}`, description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/**/*.ts', './src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
