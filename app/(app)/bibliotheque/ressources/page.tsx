import { redirect } from 'next/navigation';

export default function RessourcesRedirect() {
  redirect('/bibliotheque?onglet=ressources');
}
