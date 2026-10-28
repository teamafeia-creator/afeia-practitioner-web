import { redirect } from 'next/navigation';

/** L'ancien détail est désormais affiché à côté de la liste. */
export default function QuestionnaireDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/questionnaires?id=${encodeURIComponent(params.id)}`);
}
