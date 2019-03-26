export const validationError = (
  status: number,
  path: string,
  message: string,
) => ({
  status,
  errors: [
    {
      path,
      message,
    },
  ],
});
