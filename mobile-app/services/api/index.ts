/**
 * API Services Index
 */

export { default as apiClient } from './client';
export { formatApiError, isNetworkError, isAuthError } from './client';

export { authApi } from './auth';
export { patientApi } from './patient';
export { anamneseApi } from './anamnese';
export { complementsApi } from './complements';
export { conseilsApi } from './conseils';
export { messagesApi } from './messages';
export { journalApi } from './journal';
export { articlesApi } from './articles';
export { wearableApi } from './wearable';
export { subscriptionApi } from './subscription';
