import { education, experience, journey } from '../../data/portfolio';

export default function AboutPreview() {
  return (
    <div className="preview-stack">
      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Education</p>
          <span className="preview-section__aside">{education.length} records</span>
        </div>

        {education.map((item) => (
          <div key={item.school} className="preview-row">
            <span className="preview-row__label">{item.period}</span>
            <div className="preview-row__value">
              <strong>{item.school}</strong>
              <p>
                {item.degree} - {item.location}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Experience</p>
          <span className="preview-section__aside">{experience.length} records</span>
        </div>

        {experience.map((item) => (
          <article key={`${item.role}-${item.company}`} className="preview-entry">
            <div className="preview-entry__top">
              <div>
                <h3>{item.role}</h3>
                <p className="preview-entry__company">
                  {item.company} - {item.location}
                </p>
              </div>
              <span className="record-chip">{item.period}</span>
            </div>
            <ul className="preview-bullets">
              {item.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className="preview-row preview-row--stack">
              <span className="preview-row__label">Stack</span>
              <div className="preview-row__chips">
                {item.stack.map((tech) => (
                  <span key={tech} className="source-chip">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Timeline</p>
          <span className="preview-section__aside">{journey.length} events</span>
        </div>

        {journey.map((item) => (
          <div key={`${item.year}-${item.title}`} className="preview-row">
            <span className="preview-row__label">{item.year}</span>
            <div className="preview-row__value">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
