import type { SalesforceProject } from '../types';
export function ProjectSelect({
  projects,
  value,
  onChange,
}: {
  projects: SalesforceProject[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="project-select">
      Project
      <select aria-label="Project" value={value} onChange={(event) => onChange(event.target.value)}>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
