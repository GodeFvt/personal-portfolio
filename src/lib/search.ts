import {
  contactChannels,
  currentRoles,
  education,
  endpointRegistry,
  experience,
  identity,
  journey,
  meFacts,
  profileLinks,
  projects,
  skillGroups,
  type EndpointId,
  workingTraits,
} from '../data/portfolio';

export interface SearchSuggestion {
  id: string;
  endpointId: EndpointId;
  anchorId: string;
  title: string;
  detail: string;
  snippet: string;
  routeLabel: string;
  sectionLabel: string;
  featured?: boolean;
  keywords?: string[];
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const createSearchAnchorId = (endpointId: EndpointId, key: string) =>
  `${endpointId.slice(1)}-${slugify(key)}`;

const routeLabelFor = (endpointId: EndpointId) =>
  `${endpointRegistry[endpointId].method} ${endpointId}`;

const suggestions: SearchSuggestion[] = [
  {
    id: 'me-identity',
    endpointId: '/me',
    anchorId: createSearchAnchorId('/me', 'identity'),
    title: identity.name,
    detail: identity.role,
    snippet: identity.summary,
    routeLabel: routeLabelFor('/me'),
    sectionLabel: 'Identity',
    featured: true,
    keywords: [identity.alias, identity.location, identity.headline],
  },
  ...meFacts.map((fact) => ({
    id: `me-fact-${slugify(fact.label)}`,
    endpointId: '/me' as const,
    anchorId: createSearchAnchorId('/me', `fact-${fact.label}`),
    title: fact.value,
    detail: fact.label,
    snippet: endpointRegistry['/me'].summary,
    routeLabel: routeLabelFor('/me'),
    sectionLabel: 'Facts',
  })),
  ...currentRoles.map((role) => ({
    id: `me-role-${slugify(`${role.title}-${role.company}`)}`,
    endpointId: '/me' as const,
    anchorId: createSearchAnchorId('/me', `role-${role.title}-${role.company}`),
    title: role.title,
    detail: role.company,
    snippet: role.note,
    routeLabel: routeLabelFor('/me'),
    sectionLabel: 'Current roles',
    featured: true,
    keywords: [role.period],
  })),
  ...projects.map((project) => ({
    id: `project-${slugify(project.name)}`,
    endpointId: '/project' as const,
    anchorId: createSearchAnchorId('/project', project.name),
    title: project.name,
    detail: `${project.type} | ${project.status}`,
    snippet: project.description,
    routeLabel: routeLabelFor('/project'),
    sectionLabel: 'Projects',
    featured: true,
    keywords: [project.visibility, project.period, ...project.stack, project.repoUrl ?? '', project.liveUrl ?? ''],
  })),
  {
    id: 'about-summary',
    endpointId: '/about',
    anchorId: createSearchAnchorId('/about', 'summary'),
    title: 'From robotics to software',
    detail: 'Story arc',
    snippet:
      'The path from robotics competitions into backend-focused software delivery.',
    routeLabel: routeLabelFor('/about'),
    sectionLabel: 'Summary',
    featured: true,
  },
  ...education.map((item) => ({
    id: `about-education-${slugify(item.school)}`,
    endpointId: '/about' as const,
    anchorId: createSearchAnchorId('/about', `education-${item.school}`),
    title: item.school,
    detail: item.degree,
    snippet: `${item.period} | ${item.location}`,
    routeLabel: routeLabelFor('/about'),
    sectionLabel: 'Education',
  })),
  ...experience.map((item) => ({
    id: `about-experience-${slugify(`${item.role}-${item.company}`)}`,
    endpointId: '/about' as const,
    anchorId: createSearchAnchorId(
      '/about',
      `experience-${item.role}-${item.company}`,
    ),
    title: item.role,
    detail: item.company,
    snippet: item.bullets[0] ?? item.location,
    routeLabel: routeLabelFor('/about'),
    sectionLabel: 'Experience',
    featured: true,
    keywords: [item.period, item.location, ...item.stack],
  })),
  ...journey.map((item) => ({
    id: `about-journey-${slugify(`${item.year}-${item.title}`)}`,
    endpointId: '/about' as const,
    anchorId: createSearchAnchorId('/about', `journey-${item.year}-${item.title}`),
    title: item.title,
    detail: `${item.year} | ${item.tag}`,
    snippet: item.detail,
    routeLabel: routeLabelFor('/about'),
    sectionLabel: 'Timeline',
  })),
  ...skillGroups.flatMap((group) => [
    {
      id: `skills-group-${slugify(group.name)}`,
      endpointId: '/skills' as const,
      anchorId: createSearchAnchorId('/skills', `group-${group.name}`),
      title: group.name,
      detail: 'Skill category',
      snippet: group.items.join(' | '),
      routeLabel: routeLabelFor('/skills'),
      sectionLabel: 'Skill map',
      featured: true,
    },
    ...group.items.map((item) => ({
      id: `skills-item-${slugify(`${group.name}-${item}`)}`,
      endpointId: '/skills' as const,
      anchorId: createSearchAnchorId('/skills', `group-${group.name}`),
      title: item,
      detail: group.name,
      snippet: endpointRegistry['/skills'].summary,
      routeLabel: routeLabelFor('/skills'),
      sectionLabel: 'Skill map',
    })),
  ]),
  ...workingTraits.map((item) => ({
    id: `skills-trait-${slugify(item)}`,
    endpointId: '/skills' as const,
    anchorId: createSearchAnchorId('/skills', 'working-style'),
    title: item,
    detail: 'Working style',
    snippet: endpointRegistry['/skills'].summary,
    routeLabel: routeLabelFor('/skills'),
    sectionLabel: 'Working style',
  })),
  {
    id: 'contact-availability',
    endpointId: '/contact',
    anchorId: createSearchAnchorId('/contact', 'availability'),
    title: identity.status,
    detail: identity.location,
    snippet: endpointRegistry['/contact'].summary,
    routeLabel: routeLabelFor('/contact'),
    sectionLabel: 'Availability',
    featured: true,
  },
  ...contactChannels.map((channel) => ({
    id: `contact-channel-${slugify(channel.label)}`,
    endpointId: '/contact' as const,
    anchorId: createSearchAnchorId('/contact', `channel-${channel.label}`),
    title: channel.value,
    detail: channel.label,
    snippet: channel.note,
    routeLabel: routeLabelFor('/contact'),
    sectionLabel: 'Reach me',
    featured: channel.type === 'email' || channel.type === 'linkedin',
  })),
  ...profileLinks.map((link) => ({
    id: `contact-link-${slugify(link.label)}`,
    endpointId: '/contact' as const,
    anchorId: createSearchAnchorId('/contact', `link-${link.label}`),
    title: link.label,
    detail: link.url,
    snippet: endpointRegistry['/contact'].summary,
    routeLabel: routeLabelFor('/contact'),
    sectionLabel: 'Public links',
  })),
];

const scoreSuggestion = (item: SearchSuggestion, query: string) => {
  const haystacks = {
    title: item.title.toLowerCase(),
    detail: item.detail.toLowerCase(),
    snippet: item.snippet.toLowerCase(),
    route: item.routeLabel.toLowerCase(),
    section: item.sectionLabel.toLowerCase(),
    keywords: item.keywords?.join(' ').toLowerCase() ?? '',
  };

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  let score = 0;

  for (const term of terms) {
    if (haystacks.title === term) score += 80;
    if (haystacks.title.includes(term)) score += 32;
    if (haystacks.detail.includes(term)) score += 20;
    if (haystacks.keywords.includes(term)) score += 18;
    if (haystacks.section.includes(term)) score += 16;
    if (haystacks.route.includes(term)) score += 12;
    if (haystacks.snippet.includes(term)) score += 10;
  }

  if (item.featured) {
    score += 4;
  }

  return score;
};

export const getSearchSuggestions = (query: string, limit = 8) => {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return suggestions.filter((item) => item.featured).slice(0, limit);
  }

  return suggestions
    .map((item) => ({
      item,
      score: scoreSuggestion(item, normalized),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.item.title.localeCompare(right.item.title),
    )
    .slice(0, limit)
    .map((entry) => entry.item);
};
