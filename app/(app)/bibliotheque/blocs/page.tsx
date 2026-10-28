import { redirect } from 'next/navigation';

export default function BlocsRedirect() {
  redirect('/bibliotheque?onglet=blocs');
}
