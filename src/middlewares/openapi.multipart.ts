import { OpenApiContext } from '../framework/openapi.context';
import { createRequestAjv } from '../framework/ajv';
import {
  OpenAPIV3,
  OpenApiRequest,
  OpenApiRequestHandler,
  ValidationError,
  BadRequest,
  InternalServerError,
  HttpError,
  MultipartOpts,
} from '../framework/types';
import { MulterError } from 'multer';

const multer = require('multer');

export function multipart(
  apiDoc: OpenAPIV3.Document,
  options: MultipartOpts,
): OpenApiRequestHandler {
  const mult = multer(options.multerOpts);
  const Ajv = createRequestAjv(apiDoc, { ...options.ajvOpts });
  return (req, res, next) => {
    // TODO check that format: binary (for upload) else do not use multer.any()
    // use multer.none() if no binary parameters exist
    if (shouldHandle(Ajv, req)) {
      mult.any()(req, res, (err) => {
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
              .map((file) => file.fieldname)
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

function shouldHandle(Ajv, req: OpenApiRequest): boolean {
  const reqContentType = req.headers['content-type'];
  if (isMultipart(req) && reqContentType?.includes('multipart/form-data')) {
    return true;
  }

  const bodyRef = (<any>req?.openapi)?.schema?.$ref;
  const requestBody = bodyRef
    ? Ajv.getSchema(bodyRef)
    : (<any>req?.openapi)?.schema?.requestBody;
  const bodyContent = requestBody?.content;
  if (!bodyContent) return false;

  const content = <{ [media: string]: OpenAPIV3.MediaTypeObject }>bodyContent;
  const contentTypes = Object.entries(content);
  for (const [contentType, mediaType] of contentTypes) {
    if (!contentType.includes(reqContentType)) continue;
    const mediaTypeSchema = <any>mediaType?.schema;
    const schema = mediaTypeSchema?.$ref
      ? Ajv.getSchema(mediaTypeSchema.$ref)
      : mediaTypeSchema;
    const format = schema?.format;
    if (format === 'binary') {
      return true;
    }
  }
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
    return HttpError.create({
      status: status,
      path: req.path,
      message: err.message,
    });
    /*return payload_too_big
      ? new RequestEntityTooLarge({ path: req.path, message: err.message })
      : !unexpected
      ? new BadRequest({ path: req.path, message: err.message })
      : new InternalServerError({ path: req.path, message: err.message });*/
  } else {
    // HACK
    // TODO improve multer error handling
    const missingField = /Multipart: Boundary not found/i.test(
      err.message ?? '',
    );
    if (missingField) {
      return new BadRequest({
        path: req.path,
        message: 'multipart file(s) required',
      });
    } else {
      return new InternalServerError({ path: req.path, message: err.message });
    }
  }
}
