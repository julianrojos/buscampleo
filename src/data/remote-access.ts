export interface RemoteAccessOptions {
  readonly allowServiceRole?: boolean;
}

export function shouldFailClosed(
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): boolean {
  return Boolean(authToken?.trim() || options.allowServiceRole);
}
