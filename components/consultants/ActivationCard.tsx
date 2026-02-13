'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Mail, Eye, EyeOff, CheckCircle, Clock, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { cn } from '@/lib/cn';

interface ActivationCardProps {
  code: string;
  consultantEmail: string;
  consultantName: string;
  expiresAt?: string;
  onResendCode: () => Promise<{ success: boolean; code?: string; error?: string }>;
  className?: string;
}

export function ActivationCard({
  code,
  consultantEmail,
  consultantName,
  expiresAt,
  onResendCode,
  className
}: ActivationCardProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [displayCode, setDisplayCode] = useState(code);
  const [resending, setResending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setToast({
        title: 'Code copie',
        description: 'Le code a ete copie dans le presse-papier.',
        variant: 'success'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast({
        title: 'Erreur',
        description: 'Impossible de copier le code.',
        variant: 'error'
      });
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const result = await onResendCode();
      if (result.success) {
        if (result.code) {
          setDisplayCode(result.code);
        }
        setToast({
          title: 'Code renvoye',
          description: `Un nouvel email a ete envoye a ${consultantEmail}.`,
          variant: 'success'
        });
      } else {
        setToast({
          title: 'Erreur',
          description: result.error || 'Impossible de renvoyer le code.',
          variant: 'error'
        });
      }
    } catch {
      setToast({
        title: 'Erreur',
        description: 'Impossible de renvoyer le code.',
        variant: 'error'
      });
    } finally {
      setResending(false);
    }
  };

  // Calculate if expired
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  // Format expiration date
  const formatExpirationDate = () => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expire';
    if (diffDays === 1) return 'Expire dans 1 jour';
    return `Expire dans ${diffDays} jours`;
  };

  if (isHidden) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={cn('mb-6', className)}
        >
          <button
            onClick={() => setIsHidden(false)}
            className="flex items-center gap-2 text-sm text-sage-dark hover:text-sage-deep transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>Afficher le code d&apos;activation</span>
          </button>
        </motion.div>
        {toast && (
          <Toast
            title={toast.title}
            description={toast.description}
            variant={toast.variant}
            onClose={() => setToast(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            'relative rounded-lg p-6 mb-6',
            'glass-card',
            'border-2 border-gold',
            className
          )}
        >
          {/* Close button */}
          <button
            onClick={() => setIsHidden(true)}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/50 transition-colors"
            title="Masquer temporairement"
          >
            <X className="h-4 w-4 text-stone" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gold/20 flex items-center justify-center">
              <Clock className="h-6 w-6 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-charcoal">
                  Code d&apos;activation
                </h3>
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gold/20 text-charcoal ring-1 ring-gold/30">
                  En attente d&apos;activation
                </span>
              </div>
              <p className="text-sm text-stone mt-1">
                Partagez ce code avec {consultantName} pour qu&apos;il puisse activer son compte.
              </p>
            </div>
          </div>

          {/* Code display */}
          <div className="bg-white/60 rounded-lg p-4 mb-4 border border-divider">
            <div className="flex items-center justify-center gap-2">
              <span
                className={cn(
                  'font-mono text-3xl md:text-4xl font-bold tracking-[0.3em] text-sage-dark select-all',
                  isExpired && 'text-stone line-through'
                )}
              >
                {displayCode}
              </span>
              <button
                onClick={handleCopyCode}
                className={cn(
                  'p-2 rounded-lg transition-all',
                  copied
                    ? 'bg-sage/20 text-sage'
                    : 'hover:bg-sage-light text-sage-dark'
                )}
                title="Copier le code"
              >
                {copied ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            {expiresAt && (
              <p className={cn(
                'text-xs text-center mt-2',
                isExpired ? 'text-red-500' : 'text-stone'
              )}>
                {formatExpirationDate()}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleCopyCode}
              icon={copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              className="flex-1"
            >
              {copied ? 'Code copie' : 'Copier le code'}
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={handleResendCode}
              loading={resending}
              icon={<Mail className="h-4 w-4" />}
              className="flex-1"
            >
              Renvoyer par email
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setIsHidden(true)}
              icon={<EyeOff className="h-4 w-4" />}
              className="sm:w-auto"
            >
              Masquer
            </Button>
          </div>

          {/* Info text */}
          <p className="text-xs text-stone mt-4 text-center">
            Le consultant recevra un email a {consultantEmail} avec les instructions d&apos;activation.
            Cette carte disparaitra automatiquement une fois le compte active.
          </p>
        </motion.div>
      </AnimatePresence>

      {toast && (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
