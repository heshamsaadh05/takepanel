import { SectionPage } from '../common/SectionPage';
import { Card } from '../../components/ui/Card';

export function UserSslPage() {
  return (
    <SectionPage
      title="SSL"
      description="Issue, install, renew, and manage certificates."
      breadcrumbs={[{ label: 'Home', href: '/panel/dashboard' }, { label: 'SSL' }]}
      hero={<Card>SSL wizard scaffold is ready for Let’s Encrypt and custom cert flows.</Card>}
    />
  );
}
