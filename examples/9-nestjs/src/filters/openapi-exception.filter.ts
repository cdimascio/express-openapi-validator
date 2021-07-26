import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { error } from 'express-openapi-validator';

@Catch(...Object.values(error))
export class OpenApiExceptionFilter implements ExceptionFilter {
  catch(error: ValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, headers, ...data } = error;
    response.status(status).header(headers).json(data);
  }
}

interface ValidationError {
  status: number;
  message: string;
  errors: Array<{
    path: string;
    message: string;
    error_code?: string;
  }>;
  path?: string;
  name: string;
  headers: {
    [header: string]: string;
  };
}
