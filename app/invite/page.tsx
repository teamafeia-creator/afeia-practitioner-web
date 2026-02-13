import { Suspense } from 'react';
import InviteClient from './InviteClient';

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="text-center text-stone">Chargement...</div>}>
      <InviteClient />
    </Suspense>
  );
}
