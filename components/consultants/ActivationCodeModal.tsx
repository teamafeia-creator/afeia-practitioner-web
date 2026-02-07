'use client';

import { useState } from 'react';
import { Copy, CheckCircle, Mail, X } from 'lucide-react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '@/lib/cn';

interface ActivationCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  consultantEmail: string;
  consultantName: string;
}

export function ActivationCodeModal({
  isOpen,
  onClose,
  code,
  consultantEmail,
  consultantName
}: ActivationCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Consultant cree avec succes"
      description={`Le code d'activation a ete envoye a ${consultantName}.`}
      size="md"
      closeOnOverlayClick={false}
      closeOnEscape={false}
      showCloseButton={false}
    >
      <div className="space-y-6">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-sage" />
          </div>
        </div>

        {/* Code display */}
        <div className="bg-teal/5 rounded-xl p-6 border border-teal/20">
          <p className="text-sm text-warmgray text-center mb-3">
            Code d&apos;activation
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-4xl font-bold tracking-[0.3em] text-teal-dark select-all">
              {code}
            </span>
            <button
              onClick={handleCopyCode}
              className={cn(
                'p-2 rounded-lg transition-all',
                copied
                  ? 'bg-sage/20 text-sage'
                  : 'hover:bg-teal/10 text-teal-dark'
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
        </div>

        {/* Email info */}
        <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
          <Mail className="h-5 w-5 text-warmgray" />
          <div>
            <p className="text-sm text-charcoal font-medium">Email envoye a</p>
            <p className="text-sm text-teal-dark">{consultantEmail}</p>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-sm text-warmgray text-center">
          Le consultant peut utiliser ce code pour activer son compte dans l&apos;application mobile.
          Vous pouvez lui transmettre directement si besoin.
        </p>
      </div>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={handleCopyCode}
          icon={copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        >
          {copied ? 'Code copie' : 'Copier le code'}
        </Button>
        <Button
          variant="primary"
          onClick={onClose}
        >
          Fermer
        </Button>
      </ModalFooter>
    </Modal>
  );
}
