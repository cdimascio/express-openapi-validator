declare module 'ajv-i18n' {
  type LocalizeFunction = (errors: { message?: string }[] | null | undefined) => void;
  const localize: Record<string, LocalizeFunction>;
  export = localize;
}
