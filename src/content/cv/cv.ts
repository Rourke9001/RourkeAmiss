import type { Cv } from './types';

export const cv: Cv = {
  name: 'Rourke Amiss',
  positionLine: 'Full-stack Software Engineer',
  location: 'Johannesburg, South Africa',
  citizenship: 'Portuguese citizen · EU work authorisation',
  email: 'rourke9001@gmail.com',
  github: 'https://github.com/Rourke9001',
  linkedin: 'https://www.linkedin.com/in/rourke-silva-amiss-73b983a7/',
  profile:
    'Full-stack engineer, three and a half years, specialising in making large and aging codebases maintainable. I measure the debt, find the root causes, sequence the fix and prove the result held. Frontend-weighted through React and TypeScript at scale, with Java, Spring Boot, Go and Azure work alongside it.',
  headlineMetrics: [
    {
      label: 'Cold type-check',
      from: 177,
      to: 36.6,
      unit: 's',
      delta: '−79%',
      direction: 'down-is-good',
      verifiedBy:
        'Type-check traces captured before and after, same machine and same cold-cache conditions.',
    },
    {
      label: 'Application type debt',
      from: 1730,
      to: 1066,
      unit: '',
      delta: '−38%',
      direction: 'down-is-good',
      verifiedBy:
        'Full compiler error survey, re-audited three weeks after the remediation sequence completed.',
    },
    {
      label: 'Analytics module errors',
      from: 264,
      to: 0,
      unit: '',
      delta: '−100%',
      direction: 'down-is-good',
      verifiedBy:
        'Nine phases, each proven behaviour-preserving against 92 characterization snapshots.',
    },
    {
      label: 'Tests across two modules',
      from: 57,
      to: 328,
      unit: '',
      delta: '+475%',
      direction: 'up-is-good',
      verifiedBy: 'Suite counts before the refactor and after both modules landed.',
    },
  ],
  roles: [
    {
      org: 'Utilifeed',
      title: 'Software Engineer',
      period: 'Jan 2025 – Present',
      context:
        'Remote, Swedish energy technology company. Frontend ownership across a dual-platform district-heating product serving energy providers and homeowners — real-time grid monitoring and return-temperature analytics.',
      bullets: [
        "Surveyed the platform's 1,730 TypeScript errors into three root-cause clusters covering 48% of the total, published the remediation sequence, and executed it across three modules — taking the application to 1,066 errors, a 38% reduction in its entire type debt, and two of those modules from 57 to 328 tests.",
        'Root-caused a 177-second cold type-check to a single MUI SxProps spread pattern using tsc --generateTrace. Fixing 14 sites across 8 files cut it to 36.6s (−79%), reduced type instantiations from 4.18M to 1.02M (−76%), halved peak memory (5.67 → 3.07 GB) and dropped the build\'s heap requirement from 16 GB to 4 GB.',
        'Led a nine-phase clean-architecture refactor of the analytics module — 264 TypeScript errors to zero, tests from 57 to 296 — with every phase proven behaviour-preserving against 92 characterization snapshots, then reapplied the pattern to a second module for a further 157-error reduction.',
        'Drove a three-part design-system consolidation: retired the deprecated MUI v4 JSS engine from 57 files to zero — verified by computed-style comparison across 310 elements, 18 routes and 117 Storybook nodes with no property differences — introduced a tokenised theme layer, and moved ~540 legacy typography references onto a semantic type scale across 151 files.',
        'Architected a multi-tenant branding system giving per-organisation customisation on a shared theme base, and defined the standardised tab architecture that every tab in a module was migrated onto.',
        "Established the team's verification practice for large refactors — type-error set-diffing, characterization harnesses and browser verification driven over CDP — which repeatedly caught defects a passing test suite did not, including the repo-wide finding that ESLint had never actually run in CI (its glob matched 7 of 621 source files).",
        'Deliver across three repositories rather than handing off frontend-blocking work: new and corrected endpoints in the Go metering service (gRPC and REST), schema migrations in the Python optimisation service, and API contract fixes such as returning null rather than zero for absent series data. Review backend implementations before release to catch integration issues early.',
        'Own Jenkins pipelines and production releases, resolving pipeline failures and keeping the release path reliable.',
      ],
    },
    {
      org: 'Agnify',
      title: 'Software Engineer',
      period: 'May 2024 – Dec 2024',
      context: 'Formerly IQ Logistica. Full-stack delivery on the FarmersFriend agricultural platform.',
      bullets: [
        'Delivered features across the Farm Management, Insurance, Marketplace and Finance modules.',
        'Built Azure serverless REST APIs, improving data delivery efficiency and reducing operational overhead.',
        'Designed and implemented CI/CD pipelines, cutting deployment time by 67%.',
        'Resolved React performance bottlenecks in component lifecycle and state handling, and hardened the application with Content Security Policy protections.',
        'Mentored a QA colleague through their transition into automation testing with Selenium WebDriver.',
      ],
    },
    {
      org: 'IQ Logistica',
      title: 'Test Automation Engineer',
      period: 'Jan 2023 – Apr 2024',
      bullets: [
        'Built and maintained automated test frameworks in Selenium WebDriver, integrating them into CI/CD workflows to improve release confidence.',
        'Contributed to Azure microservices and serverless backend implementations.',
      ],
    },
  ],
  projects: [
    {
      name: 'AmissProj — full-stack Java rebuild of a legacy application',
      period: '2026',
      context:
        'An undocumented, non-building NetBeans/Swing and MySQL application, rebuilt as a Spring Boot 3 REST API over a plain-Java rules core and consumed by a React 19 SPA.',
      links: [{ label: 'github.com/Rourke9001/amissproj', href: 'https://github.com/Rourke9001/amissproj' }],
      bullets: [
        'Restructured into ports and adapters (domain / application / infrastructure / presentation). Proved the boundary was real by later swapping raw JDBC for Spring Data JPA without touching a single rule in the core.',
        '87-test JUnit 5 and Mockito suite at ~88% instruction coverage over the rules layer, plus Testcontainers integration tests against real MySQL — which caught a transaction-boundary bug every mocked test missed. 131 frontend tests in Vitest.',
        'Flyway-owned schema with separate migrator and runtime database accounts, JPA in validate-only mode, and a CI job that builds a throwaway MySQL container from the migrations alone.',
        'Stateless HS256 JWT authentication with a scope filter that returns 403 across accounts — closing the IDOR class, not merely requiring a login. Eliminated SQL injection across all 36 queries and migrated plaintext passwords to BCrypt with transparent re-hashing on login.',
        'GitHub Actions as a required status check on a protected main, with the Maven wrapper committed so CI runners need no pre-installed toolchain.',
      ],
    },
    {
      name: 'BAC Logistics & BAC Transport — two production sites on Azure',
      period: '2026',
      context: 'baclogistics.co.za · bactrans.co.za — sole engineer, live on custom domains.',
      links: [
        { label: 'baclogistics.co.za', href: 'https://baclogistics.co.za' },
        { label: 'bactrans.co.za', href: 'https://bactrans.co.za' },
      ],
      bullets: [
        'Migrated the primary site to Azure Static Web Apps and retired the previous host only once the migration was verified against the deployed environment. 37 static pages plus 90 blog posts served dynamically from Blob Storage.',
        'Built the blog CMS a marketing team uses day to day — Azure Functions rendering the public routes behind a role-guarded admin API and UI — alongside a contact form with honeypot and rate limiting delivering through Microsoft 365.',
        'Structured the deployment so the shipped folder is an allowlist by construction: specifications, brand source and internal documentation cannot be served publicly because they are never in the folder that deploys.',
      ],
    },
  ],
  skills: [
    {
      label: 'Frontend',
      items: ['React', 'TypeScript', 'MobX', 'TanStack Query', 'MUI & Emotion', 'Highcharts', 'Vite', 'Nx monorepos'],
    },
    {
      label: 'Backend',
      items: [
        'Java 21',
        'Spring Boot 3',
        'Spring Data JPA',
        'Spring Security',
        'Go',
        'gRPC',
        'Python',
        'Azure Functions',
        'REST API design',
      ],
    },
    {
      label: 'Data',
      items: ['MySQL', 'PostgreSQL', 'SQL', 'Flyway migrations'],
    },
    {
      label: 'Cloud & DevOps',
      items: ['Azure Static Web Apps', 'Azure Serverless', 'Jenkins', 'GitHub Actions', 'Maven'],
    },
    {
      label: 'Testing',
      items: ['Vitest', 'Playwright', 'JUnit 5', 'Mockito', 'Testcontainers', 'Selenium WebDriver', 'characterization testing'],
    },
    {
      label: 'Practice',
      items: [
        'Clean and hexagonal architecture',
        'incremental refactoring',
        'technical-debt measurement',
        'code review',
        'sprint planning',
      ],
    },
  ],
  credentials: [
    { what: 'BSc Computer Science', who: 'University of Pretoria' },
    { what: 'Microsoft Certified: Azure Developer Associate' },
    { what: 'Microsoft Certified: Azure Fundamentals' },
    { what: 'ISTQB Certified Tester — Foundation Level' },
  ],
};
