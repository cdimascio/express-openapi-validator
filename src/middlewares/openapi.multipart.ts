import { OpenApiContext } from '../framework/openapi.context';
import { validationError } from './util';
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
          next(error(req, err));
        } else {
          // TODO:
          // If a form parameter 'file' is defined to take file value, but the user provides a string value instead
          // req.files will be empty and req.body.file will be populated with a string
          // This will incorrectly PASS validation. 
          // Instead, we should return a 400 with an invalid type e.g. file expects a file, but found string.
          // 
          // In order to support this, we likely need to inspect the schema directly to find the type. 
          // For example, if param with type: 'string', format: 'binary' is defined, we expect to see it in
          // req.files. If it's not present we should throw a 400
          // 
          // This is a bit complex because the schema may be defined inline (easy) or via a $ref (complex) in which
          // case we must follow the $ref to check the type.
          if (req.files) {
            // add files to body
            req.files.forEach(f => {
              req.body[f.fieldname] = '';
            });
          }
          next();
        }
      });
    } else {
      next();
    }
  };
}

function isValidContentType(req) {
  const contentType = req.headers['content-type'];
  return !contentType || contentType.includes('multipart/form-data');
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

function error(req, err) {
  if (err instanceof multer.MulterError) {
    // TODO is special handling for MulterErrors needed
    console.error(err);
    return validationError(500, req.path, err.message);
  } else {
    // HACK
    // TODO improve multer error handling
    const missingField = /Multipart: Boundary not found/i.test(
      err.message || '',
    );
    if (missingField) {
      return validationError(400, req.path, 'multipart file(s) required.');
    } else {
      console.error(err);
      return validationError(500, req.path, err.message);
    }
  }
}
