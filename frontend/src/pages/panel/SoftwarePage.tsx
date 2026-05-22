import { SectionPage } from '../common/SectionPage';
import { Card } from '../../components/ui/Card';

export function UserSoftwarePage() {
  return (
    <SectionPage
      title="Software"
      description="PHP versions, extensions, INI editor, and application managers."
      breadcrumbs={[{ label: 'Home', href: '/panel/dashboard' }, { label: 'Software' }]}
      hero={<Card>Software management scaffold is ready for PHP and runtime version controls.</Card>}
    />
  );
}
