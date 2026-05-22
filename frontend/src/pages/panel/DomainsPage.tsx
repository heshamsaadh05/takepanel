import { SectionPage } from '../common/SectionPage';
import { Card } from '../../components/ui/Card';

export function UserDomainsPage() {
  return (
    <SectionPage
      title="Domains"
      description="Addon domains, subdomains, aliases, redirects, and force-HTTPS controls."
      breadcrumbs={[{ label: 'Home', href: '/panel/dashboard' }, { label: 'Domains' }]}
      hero={<Card>Domain management scaffold is ready for document roots and SSL mapping.</Card>}
    />
  );
}
