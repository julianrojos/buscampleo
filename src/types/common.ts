export interface ApiError {
  readonly code: string;
  readonly message: string;
}

export type ApiResponse<T> =
  | {
      readonly ok: true;
      readonly data: T;
    }
  | {
      readonly ok: false;
      readonly error: ApiError;
    };
