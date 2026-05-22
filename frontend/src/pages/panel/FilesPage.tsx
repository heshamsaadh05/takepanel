import { SectionPage } from '../common/SectionPage';
import { Card } from '../../components/ui/Card';

export function UserFilesPage() {
  return (
    <SectionPage
      title="Files"
      description="File manager, directory privacy, disk usage, and FTP access."
      breadcrumbs={[{ label: 'Home', href: '/panel/dashboard' }, { label: 'Files' }]}
      hero={<Card>File manager scaffold is ready for browse/upload/edit/permissions flows.</Card>}
    />
  );
}
