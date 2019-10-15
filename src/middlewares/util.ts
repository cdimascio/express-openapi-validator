import ono from 'ono';
import { Request } from 'express';
import { OpenApiRequest } from '../framework/types';

export function extractContentType(req: Request) {
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
) => ({
  status,
  errors: [
    {
      path,
      message,
      ...({ errors } || {}),
    },
  ],
});

export function validationError(status: number, path: string, message: string) {
  const err = _validationError(status, path, message);
  return ono(err, message);
}

export function ajvErrorsToValidatorError(status: number, errors) {
  return {
    status,
    errors: errors.map(e => {
      const required =
        e.params &&
        e.params.missingProperty &&
        e.dataPath + '.' + e.params.missingProperty;
      const additionalProperty =
        e.params &&
        e.params.additionalProperty &&
        e.dataPath + '.' + e.params.additionalProperty;
      const path = required || additionalProperty || e.dataPath || e.schemaPath;
      return {
        path,
        message: e.message,
        errorCode: `${e.keyword}.openapi.validation`,
      };
    }),
  };
}
