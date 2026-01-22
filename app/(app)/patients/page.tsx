import Link from 'next/link';
import { mockPatients } from '../../../lib/mock';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';

export default function PatientsPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Patients</h1>
          <p className="text-sm text-marine/70">Un patient ↔ un naturopathe actif. Changement = nouveau dossier.</p>
        </div>
        <div className="w-full md:w-80">
          <Input placeholder="Rechercher (à brancher)" disabled />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-sm text-marine/80">{mockPatients.length} dossiers</div>
            <Badge variant="info">CRM</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-warmgray">
                  <th className="py-2">Patient</th>
                  <th className="py-2">Statut</th>
                  <th className="py-2">Dernière consultation</th>
                  <th className="py-2">Signaux</th>
                </tr>
              </thead>
              <tbody>
                {mockPatients.map((p) => (
                  <tr key={p.id} className="border-t border-black/5 hover:bg-sable/40">
                    <td className="py-3">
                      <Link className="font-medium text-teal hover:underline" href={`/patients/${p.id}`}>
                        {p.name}
                      </Link>
                      <div className="text-xs text-marine/60">{p.age} ans • {p.city}</div>
                    </td>
                    <td className="py-3">
                      {p.isPremium ? <Badge variant="premium">Premium</Badge> : <Badge variant="info">Standard</Badge>}
                    </td>
                    <td className="py-3">
                      <div className="text-marine/90">{p.lastConsultation}</div>
                      <div className="text-xs text-warmgray">Prochain RDV : {p.nextConsultation ?? '—'}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {p.flags.newQuestionnaire ? <Badge variant="new">Questionnaire</Badge> : null}
                        {p.flags.newCircularData ? <Badge variant="attention">Circular</Badge> : null}
                        {p.flags.unreadMessages ? <Badge variant="attention">{p.flags.unreadMessages} msg</Badge> : <Badge variant="success">OK</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
