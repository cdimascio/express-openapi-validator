import { OpenApiContext } from '../framework/openapi.context';
import { validationError } from './util';
import { Request } from 'express';
import {
  OpenApiRequest,
  OpenApiRequestHandler,
  ValidationError,
} from '../framework/types';
import { MulterError } from 'multer';

const multer = require('multer');

export function multipart(
  OpenApiContext: OpenApiContext,
  multerOpts: {},
): OpenApiRequestHandler {
  const mult = multer(multerOpts);
  return (req, res, next) => {
    // TODO check that format: binary (for upload) else do not use multer.any()
    // use multer.none() if no binary parameters exist
    if (isMultipart(req) && isValidContentType(req)) {
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
            // to handle single and multiple file upload at the same time, let us this initialize this count variable
            // for example { "files": 5 }
            const count_by_fieldname = (<Express.Multer.File[]>req.files)
              .map(file => file.fieldname)
              .reduce((acc, curr) => {
                acc[curr] = (acc[curr] || 0) + 1;
                return acc;
              }, {});

            // add file(s) to body
            Object.entries(count_by_fieldname).forEach(
              ([fieldname, count]: [string, number]) => {
                // TODO maybe also check in the api doc if it is a single upload or multiple
                const is_multiple = count > 1;
                req.body[fieldname] = is_multiple
                  ? new Array(count).fill('')
                  : '';
              },
            );
          }
          next();
        }
      });
    } else {
      next();
    }
  };
}

function isValidContentType(req: Request): boolean {
  const contentType = req.headers['content-type'];
  return !contentType || contentType.includes('multipart/form-data');
}

function isMultipart(req: OpenApiRequest): boolean {
  return (<any>req?.openapi)?.schema?.requestBody?.content?.[
    'multipart/form-data'
  ];
}

function error(req: OpenApiRequest, err: Error): ValidationError {
  if (err instanceof multer.MulterError) {
    // distinguish common errors :
    // - 413 ( Request Entity Too Large ) : Too many parts / File too large / Too many files
    // - 400 ( Bad Request ) : Field * too long / Too many fields
    // - 500 ( Internal Server Error ) : Unexpected field
    const multerError = <MulterError>err;
    const payload_too_big = /LIMIT_(FILE|PART)_(SIZE|COUNT)/.test(
      multerError.code,
    );
    const unexpected = /LIMIT_UNEXPECTED_FILE/.test(multerError.code);
    const status = payload_too_big ? 413 : !unexpected ? 400 : 500;
    return validationError(status, req.path, err.message);
  } else {
    // HACK
    // TODO improve multer error handling
    const missingField = /Multipart: Boundary not found/i.test(
      err.message ?? '',
    );
    if (missingField) {
      return validationError(400, req.path, 'multipart file(s) required');
    } else {
      return validationError(500, req.path, err.message);
    }
  }
}
