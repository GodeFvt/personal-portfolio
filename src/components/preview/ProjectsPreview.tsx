import { projects } from '../../data/portfolio';

export default function ProjectsPreview() {
  return (
    <div className="preview-stack">
      {projects.map((project) => (
        <section key={project.name} className="preview-section">
          <article className="preview-entry preview-entry--spacious">
            <div>
              <p className="preview-section__title">{project.type}</p>
              <h3>{project.name}</h3>
              <div className="preview-entry__meta">
                <span>{project.period}</span>
                <span>{project.visibility}</span>
              </div>
            </div>

            <div className="preview-entry__top">
              <p className="preview-entry__copy">{project.description}</p>
              <span className="record-chip">{project.status}</span>
            </div>

            <ul className="preview-bullets">
              {project.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="preview-row preview-row--stack">
              <span className="preview-row__label">Stack</span>
              <div className="preview-row__chips">
                {project.stack.map((item) => (
                  <span key={item} className="source-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </section>
      ))}
    </div>
  );
}
