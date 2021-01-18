import { Request, Response, NextFunction } from 'express';
import { OpenAPIV3 } from 'openapi-framework';

export interface OpenApiRequest extends Request {
  openapi?: OpenApiRequestMetadata | {};
}

export interface OpenApiRequestMetadata {
  expressRoute: string;
  openApiRoute: string;
  pathParams: { [index: string]: string };
  schema: OpenAPIV3.OperationObject;
}

export type OpenApiRequestHandler = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
) => any;
