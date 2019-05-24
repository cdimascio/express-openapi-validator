import { OpenApiContext } from '../openapi.context';
import { validationError } from '../errors';
import * as multer from 'multer';

export function multipart(openApiContext: OpenApiContext, multerOpts: {} = {}) {
  const mult = multer(multerOpts);
  return (req, res, next) => {
    if (isMultipart(req)) {
      if (!isValidContentType(req)) {
        throw validationError(415, req.path, 'unsupported media type');
      }
      mult.any()(req, res, err => {
        if (err) {
          if (err instanceof multer.MulterError) {
            // TODO is special handling for MulterErrors needed
            console.error(err);
            next(validationError(500, req.path, err.message));
          } else {
            // HACK
            // TODO improve multer error handling
            const missingField = /Multipart: Boundary not found/i.test(
              err.message || '',
            );
            if (missingField) {
              next(validationError(400, req.path, 'multipart file(s) required.'))
            } else {
              console.error(err);
              next(validationError(500, req.path, err.message));
            }
          }
        } else {
          req.files.forEach(f => {
            req.body[f.fieldname] = '';
          });
          next();
        }
      });
    } else {
      next();
    }
  };
}

function isValidContentType(req) {
  return req.headers['content-type'].includes('multipart/form-data');
}

function isMultipart(req) {
  return (
    req.openapi &&
    req.openapi.schema &&
    req.openapi.schema.requestBody &&
    req.openapi.schema.requestBody.content &&
    req.openapi.schema.requestBody.content['multipart/form-data']
  );
}
