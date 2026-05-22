import { SectionPage } from '../common/SectionPage';
import { Card } from '../../components/ui/Card';

export function UserEmailPage() {
  return (
    <SectionPage
      title="Email"
      description="Mailboxes, forwarders, autoresponders, routing, and deliverability."
      breadcrumbs={[{ label: 'Home', href: '/panel/dashboard' }, { label: 'Email' }]}
      hero={<Card>Email administration scaffold is ready for mailbox and routing flows.</Card>}
    />
  );
}
