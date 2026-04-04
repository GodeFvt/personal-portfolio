import { BriefcaseBusiness, Camera, Code2, Globe, Mail, Phone } from 'lucide-react';
import { contactChannels, identity, profileLinks, type ContactChannel } from '../../data/portfolio';
import { createSearchAnchorId } from '../../lib/search';

const contactIcons: Record<ContactChannel['type'], typeof Mail> = {
  email: Mail,
  phone: Phone,
  github: Code2,
  linkedin: BriefcaseBusiness,
  website: Globe,
  instagram: Camera,
};

export default function ContactPreview() {
  return (
    <div className="preview-stack">
      <section className="preview-section" data-search-anchor={createSearchAnchorId('/contact', 'reach-me')}>
        <div className="preview-section__header">
          <p className="preview-section__title">Reach me</p>
          <span className="preview-section__aside">{contactChannels.length} channels</span>
        </div>

        {contactChannels.map((channel) => {
          const Icon = contactIcons[channel.type];

          return (
            <a
              key={channel.href}
              className="preview-link-row"
              href={channel.href}
              target="_blank"
              rel="noreferrer"
              data-search-anchor={createSearchAnchorId('/contact', `channel-${channel.label}`)}>
              <div className="preview-link-row__main">
                <Icon size={15} />
                <div className="preview-link-row__copy">
                  <strong>{channel.label}</strong>
                  <p>{channel.value}</p>
                </div>
              </div>
              <span className="preview-link-row__note">{channel.note}</span>
            </a>
          );
        })}
      </section>

      <section className="preview-section" data-search-anchor={createSearchAnchorId('/contact', 'public-links')}>
        <div className="preview-section__header">
          <p className="preview-section__title">Public links</p>
          <span className="preview-section__aside">{profileLinks.length} links</span>
        </div>

        <div className="preview-row preview-row--stack">
          <span className="preview-row__label">Links</span>
          <div className="preview-row__chips">
            {profileLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="source-chip source-chip--link"
                data-search-anchor={createSearchAnchorId('/contact', `link-${link.label}`)}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="preview-section" data-search-anchor={createSearchAnchorId('/contact', 'availability')}>
        <div className="preview-section__header">
          <p className="preview-section__title">Availability</p>
          <span className="preview-section__aside">status</span>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Hiring</span>
          <div className="preview-row__value">
            <strong>{identity.status}</strong>
            <p>{identity.location}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
