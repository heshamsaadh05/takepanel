import { SectionPage } from '../common/SectionPage';
import { Card } from '../../components/ui/Card';

export function UserDatabasesPage() {
  return (
    <SectionPage
      title="Databases"
      description="Create databases, users, privileges, and backup/restore workflows."
      breadcrumbs={[{ label: 'Home', href: '/panel/dashboard' }, { label: 'Databases' }]}
      hero={<Card>Database management scaffold is ready for create/assign/backup flows.</Card>}
    />
  );
}
