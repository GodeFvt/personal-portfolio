import { projects } from '../../data/portfolio';
import { createSearchAnchorId } from '../../lib/search';

export default function ProjectsPreview() {
  return (
    <div className="preview-stack">
      {projects.map((project) => (
        <section key={project.name} className="preview-section" data-search-anchor={createSearchAnchorId('/project', project.name)}>
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

            {project.repoUrl || project.liveUrl ? (
              <div className="preview-row preview-row--stack">
                <span className="preview-row__label">Links</span>
                <div className="preview-row__chips">
                  {project.repoUrl ? (
                    <a href={project.repoUrl} target="_blank" rel="noreferrer" className="source-chip source-chip--link">
                      GitHub
                    </a>
                  ) : null}
                  {project.liveUrl ? (
                    <a href={project.liveUrl} target="_blank" rel="noreferrer" className="source-chip source-chip--link">
                      Live
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>
        </section>
      ))}
    </div>
  );
}
