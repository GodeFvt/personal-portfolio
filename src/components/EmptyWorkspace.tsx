import { BriefcaseBusiness, Code2, MapPin, Plus } from 'lucide-react';
import { identity, profileLinks } from '../data/portfolio';

interface EmptyWorkspaceProps {
  onOpenDefault: () => void;
}

export default function EmptyWorkspace({ onOpenDefault }: EmptyWorkspaceProps) {
  const githubLink = profileLinks.find((item) => item.kind === 'github');
  const linkedInLink = profileLinks.find((item) => item.kind === 'linkedin');

  return (
    <section className="empty-workspace">
      <div className="empty-workspace__avatar-shell">
        <img className="empty-workspace__avatar" src="/profile.jpg" alt={identity.name} />
      </div>

      <div className="empty-workspace__copy">
        <h2>{identity.name}</h2>
        <div className="empty-workspace__meta">
          <span className="empty-workspace__country">
            <MapPin size={14} />
            <span>Thailand</span>
          </span>
          <span className="record-chip">Fullstack Developer</span>
        </div>
      </div>

      <div className="empty-workspace__actions">
        <button type="button" className="solid-button empty-workspace__primary" onClick={onOpenDefault}>
          <Plus size={15} />
          <span>Open /me</span>
        </button>

        {linkedInLink ? (
          <a className="empty-workspace__link-button" href={linkedInLink.url} target="_blank" rel="noreferrer">
            <BriefcaseBusiness size={15} />
            <span>LinkedIn</span>
          </a>
        ) : null}

        {githubLink ? (
          <a className="empty-workspace__link-button" href={githubLink.url} target="_blank" rel="noreferrer">
            <Code2 size={15} />
            <span>GitHub</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}
