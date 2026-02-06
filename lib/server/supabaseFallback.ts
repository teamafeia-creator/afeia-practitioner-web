type SupabaseError = {
  code?: string;
  message?: string;
};

export function isMissingRelation(error: SupabaseError | null | undefined) {
  if (!error) return false;
  return error.code === '42P01' || error.message?.includes('does not exist') || false;
}

export async function queryWithFallback<TPrimary, TFallback = TPrimary>(
  primary: () => Promise<TPrimary>,
  fallback: () => Promise<TFallback>
) {
  const primaryResult = await primary();
  const error = (primaryResult as { error?: SupabaseError | null })?.error;
  if (isMissingRelation(error)) {
    return await fallback();
  }
  return primaryResult;
}
