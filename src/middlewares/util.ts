import ono from 'ono';
import * as Ajv from 'ajv';
import { Request } from 'express';
import { ValidationError } from '../framework/types';

export class ContentType {
  public contentType: string = null;
  public mediaType: string = null;
  public charSet: string = null;
  public withoutBoundary: string = null;
  private constructor(contentType: string | null) {
    this.contentType = contentType;
    if (contentType) {
      this.withoutBoundary = contentType.replace(/;\s{0,}boundary.*/, '');
      this.mediaType = this.withoutBoundary.split(';')[0].trim();
      this.charSet = this.withoutBoundary.split(';')[1];
      if (this.charSet) {
        this.charSet = this.charSet.trim();
      }
    }
  }
  public static from(req: Request): ContentType {
    return new ContentType(req.headers['content-type']);
  }

  public equivalents(): string[] {
    if (!this.withoutBoundary) return [];
    if (this.charSet) {
      return [this.mediaType, `${this.mediaType}; ${this.charSet}`];
    }
    return [this.withoutBoundary, `${this.mediaType}; charset=utf-8`];
  }
}

const _validationError = (
  status: number,
  path: string,
  message: string,
): ValidationError => ({
  status,
  errors: [
    {
      path,
      message,
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

/**
 * (side-effecting) modifies the errors object
 * TODO - do this some other way
 * @param errors
 */
export function augmentAjvErrors(
  errors: Ajv.ErrorObject[] = [],
): Ajv.ErrorObject[] {
  errors.forEach(e => {
    if (e.keyword === 'enum') {
      const params: any = e.params;
      const allowedEnumValues = params?.allowedValues;
      e.message = !!allowedEnumValues
        ? `${e.message}: ${allowedEnumValues.join(', ')}`
        : e.message;
    }
  });
  return errors;
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
        params?.missingProperty && e.dataPath + '.' + params.missingProperty;
      const additionalProperty =
        params?.additionalProperty &&
        e.dataPath + '.' + params.additionalProperty;
      const path = required ?? additionalProperty ?? e.dataPath ?? e.schemaPath;
      return {
        path,
        message: e.message,
        errorCode: `${e.keyword}.openapi.validation`,
      };
    }),
  };
}

export const deprecationWarning =
  process.env.NODE_ENV !== 'production' ? console.warn : () => {};
