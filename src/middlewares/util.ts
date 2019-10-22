import ono from 'ono';
import * as Ajv from 'ajv';
import { Request } from 'express';
import { ValidationError } from '../framework/types';

export function extractContentType(req: Request): string {
  let contentType = req.headers['content-type'] || 'not_provided';
  let end = contentType.indexOf(';');
  end = end === -1 ? contentType.length : end;
  if (contentType) {
    return contentType.substring(0, end);
  }
  return contentType;
}

const _validationError = (
  status: number,
  path: string,
  message: string,
  errors?: any, // TODO rename - normalize...something else
): ValidationError => ({
  status,
  errors: [
    {
      path,
      message,
      ...({ errors } || {}),
    },
  ],
});

export function validationError(
  status: number,
  path: string,
  message: string,
): ValidationError {
  const err = _validationError(status, path, message);
  return ono(err, message);
}

export function ajvErrorsToValidatorError(
  status: number,
  errors: Ajv.ErrorObject[],
): ValidationError {
  return {
    status,
    errors: errors.map(e => {
      const params: any = e.params;
      const required =
        params &&
        params.missingProperty &&
        e.dataPath + '.' + params.missingProperty;
      const additionalProperty =
        e.params &&
        params.additionalProperty &&
        e.dataPath + '.' + params.additionalProperty;
      const path = required || additionalProperty || e.dataPath || e.schemaPath;
      return {
        path,
        message: e.message,
        errorCode: `${e.keyword}.openapi.validation`,
      };
    }),
  };
}
