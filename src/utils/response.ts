import { Response } from 'express';

export interface ApiResponseFormat {
  success: boolean;
  message: string;
  error?: string; // Added for mobile client compatibility
  data?: any;
  errors?: any;
  timestamp: string;
}

export const sendSuccess = (
  res: Response,
  data: any,
  message = 'Success',
  status = 200
) => {
  res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  } as ApiResponseFormat);
};

export const sendError = (
  res: Response,
  message: string,
  status = 400,
  errors: any = null
) => {
  res.status(status).json({
    success: false,
    message,
    error: message, // Added for mobile client compatibility
    errors,
    timestamp: new Date().toISOString(),
  } as ApiResponseFormat);
};
