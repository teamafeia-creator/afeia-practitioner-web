type SupabaseError = {
  code?: string;
  message?: string;
};

type Awaitable<T> = Promise<T> | { then: (onfulfilled: (value: T) => unknown) => unknown };

export function isMissingRelation(error: SupabaseError | null | undefined) {
  if (!error) return false;
  return error.code === '42P01' || error.message?.includes('does not exist') || false;
}

export async function queryWithFallback<TPrimary, TFallback = TPrimary>(
  primary: () => Awaitable<TPrimary>,
  fallback: () => Awaitable<TFallback>
) {
  const primaryResult = (await Promise.resolve(primary())) as TPrimary;
  const error = (primaryResult as { error?: SupabaseError | null })?.error;
  if (isMissingRelation(error)) {
    return (await Promise.resolve(fallback())) as TFallback;
  }
  return primaryResult;
}
