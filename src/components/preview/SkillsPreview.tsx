import { skillGroups, workingTraits } from '../../data/portfolio';

export default function SkillsPreview() {
  return (
    <div className="preview-stack">
      {skillGroups.map((group) => (
        <section key={group.name} className="preview-section">
          <div className="preview-row preview-row--stack">
            <span className="preview-row__label">{group.name}</span>
            <div className="preview-row__chips">
              {group.items.map((item) => (
                <span key={item} className="source-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Working style</p>
          <span className="preview-section__aside">workflow</span>
        </div>

        {workingTraits.map((item) => (
          <div key={item} className="preview-row">
            <span className="preview-row__label">Trait</span>
            <div className="preview-row__value">
              <strong>{item}</strong>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
