import { SectionPage } from '../common/SectionPage';
import { Card } from '../../components/ui/Card';

export function UserBackupsPage() {
  return (
    <SectionPage
      title="Backups"
      description="Run, schedule, restore, and validate backups for your account."
      breadcrumbs={[{ label: 'Home', href: '/panel/dashboard' }, { label: 'Backups' }]}
      hero={<Card>Backup wizard scaffold is ready for full/partial restore flows.</Card>}
    />
  );
}
