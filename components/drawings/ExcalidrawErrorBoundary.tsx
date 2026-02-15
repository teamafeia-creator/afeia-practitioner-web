'use client';

import React, { Component, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  onClose: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ExcalidrawErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ExcalidrawErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-gold" />
          <h3 className="text-lg font-semibold text-charcoal">
            L&apos;éditeur de schémas n&apos;a pas pu se charger
          </h3>
          <p className="text-sm text-stone max-w-md">
            Vérifiez votre connexion internet et réessayez.
            Si le problème persiste, contactez le support.
          </p>
          <p className="text-xs text-stone/60 font-mono">
            {this.state.error?.message}
          </p>
          <Button variant="primary" onClick={this.props.onClose}>
            Fermer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
