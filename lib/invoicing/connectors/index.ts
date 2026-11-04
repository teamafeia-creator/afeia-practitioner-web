import { abby } from './abby';
import { pennylane } from './pennylane';
import type { BillingConnector, ConnectorProvider } from './types';

export const CONNECTORS: Record<ConnectorProvider, BillingConnector> = { pennylane, abby };

export * from './types';
