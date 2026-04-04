import { currentRoles, identity, meFacts } from '../../data/portfolio';
import { createSearchAnchorId } from '../../lib/search';

export default function MePreview() {
  return (
    <div className="preview-stack">
      <section className="preview-section" data-search-anchor={createSearchAnchorId('/me', 'identity')}>
        <div className="preview-section__header">
          <p className="preview-section__title">Identity</p>
          <span className="preview-section__aside">GET /me</span>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Name</span>
          <div className="preview-row__value">
            <strong>{identity.name}</strong>
            <p>{identity.alias}</p>
          </div>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Role</span>
          <div className="preview-row__value">
            <strong>{identity.role}</strong>
            <p>{identity.headline}</p>
          </div>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Status</span>
          <div className="preview-row__value">
            <strong>{identity.status}</strong>
          </div>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Location</span>
          <div className="preview-row__value">
            <strong>{identity.location}</strong>
            <p>{identity.education}</p>
          </div>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Summary</span>
          <div className="preview-row__value">
            <p>{identity.summary}</p>
          </div>
        </div>
      </section>

      <section className="preview-section" data-search-anchor={createSearchAnchorId('/me', 'facts')}>
        <div className="preview-section__header">
          <p className="preview-section__title">Facts</p>
          <span className="preview-section__aside">{meFacts.length} items</span>
        </div>

        {meFacts.map((fact) => (
          <div key={fact.label} className="preview-row" data-search-anchor={createSearchAnchorId('/me', `fact-${fact.label}`)}>
            <span className="preview-row__label">{fact.label}</span>
            <div className="preview-row__value">
              <strong>{fact.value}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="preview-section" data-search-anchor={createSearchAnchorId('/me', 'current-roles')}>
        <div className="preview-section__header">
          <p className="preview-section__title">Current roles</p>
          <span className="preview-section__aside">{currentRoles.length} active</span>
        </div>

        {currentRoles.map((role) => (
          <article
            key={`${role.title}-${role.company}`}
            className="preview-entry"
            data-search-anchor={createSearchAnchorId('/me', `role-${role.title}-${role.company}`)}>
            <div className="preview-entry__top">
              <div>
                <h3>{role.title}</h3>
                <p className="preview-entry__company">{role.company}</p>
              </div>
              <span className="record-chip">{role.period}</span>
            </div>
            <p className="preview-entry__copy">{role.note}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
