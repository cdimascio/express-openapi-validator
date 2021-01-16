import * as MulterExt from 'multer';

declare module 'multer' {
  type ErrorCodes =
    | 'LIMIT_PART_COUNT'
    | 'LIMIT_FILE_SIZE'
    | 'LIMIT_FILE_COUNT'
    | 'LIMIT_FIELD_KEY'
    | 'LIMIT_FIELD_VALUE'
    | 'LIMIT_FIELD_COUNT'
    | 'LIMIT_UNEXPECTED_FILE';

  interface MulterError extends Error {
    /* Constructor for MulterError */
    new (code: ErrorCodes, field?: string);
    /* Name of the constructor */
    name: string;
    /* Error Message */
    message: string;
    /* Error code */
    code: ErrorCodes;
    /* Field Name */
    field?: string;
  }
}
