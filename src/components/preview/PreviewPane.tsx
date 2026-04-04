import type { EndpointId } from '../../data/portfolio';
import AboutPreview from './AboutPreview';
import ContactPreview from './ContactPreview';
import MePreview from './MePreview';
import ProjectsPreview from './ProjectsPreview';
import SkillsPreview from './SkillsPreview';

interface PreviewPaneProps {
  endpointId: EndpointId;
}

export default function PreviewPane({ endpointId }: PreviewPaneProps) {
  switch (endpointId) {
    case '/me':
      return <MePreview />;
    case '/project':
      return <ProjectsPreview />;
    case '/about':
      return <AboutPreview />;
    case '/skills':
      return <SkillsPreview />;
    case '/contact':
      return <ContactPreview />;
    default:
      return null;
  }
}
