import cn from 'clsx'
import { Link } from '@/components/ui/link'
import s from './features.module.css'

const PROBLEMS_SOLVED = [
  {
    problem: 'Manual memoization everywhere',
    solution: 'React Compiler',
    detail: 'Automatic optimization—just write code',
  },
  {
    problem: 'Janky scroll on creative sites',
    solution: 'Lenis + ScrollTrigger',
    detail: 'Smooth scroll with GSAP-like API',
  },
  {
    problem: 'WebGL context lost on navigation',
    solution: 'Global Canvas',
    detail: 'Persistent context, zero flicker',
  },
  {
    problem: 'Multiple RAF loops fighting',
    solution: 'Tempus',
    detail: 'Single orchestrated animation frame',
  },
  {
    problem: 'Bloated bundles from unused code',
    solution: 'Optional integrations',
    detail: "Remove what you don't need",
  },
  {
    problem: 'No visibility into performance',
    solution: 'Debug Panel',
    detail: 'Cmd+O for FPS, grid, Lenis stats',
  },
] as const

const ARCHITECTURE = {
  layers: [
    {
      name: 'Your Code',
      items: ['Pages', 'Components', 'Business Logic'],
    },
    {
      name: 'Satus Layer',
      items: [
        'Image/Link wrappers',
        'ScrollTrigger hooks',
        'WebGL tunnel',
        'Debug tools',
      ],
    },
    {
      name: 'Performance Core',
      items: ['Lenis (scroll)', 'Tempus (RAF)', 'Hamo (hooks)'],
    },
    {
      name: 'Foundation',
      items: ['Next.js 16', 'React 19 + Compiler', 'Tailwind v4'],
    },
  ],
  integrations: ['Sanity', 'Shopify', 'HubSpot', 'Mailchimp'],
} as const

function ProblemSolutionTable() {
  return (
    <div className={s.table}>
      <div className={s.tableHeader}>
        <span className={s.tableHeaderCell}>Problem</span>
        <span className={s.tableHeaderCell}>Solution</span>
      </div>
      {PROBLEMS_SOLVED.map((item) => (
        <div key={item.problem} className={s.tableRow}>
          <div className={s.problemCell}>
            <span className={s.problemText}>{item.problem}</span>
          </div>
          <div className={s.solutionCell}>
            <span className={s.solutionName}>{item.solution}</span>
            <span className={s.solutionDetail}>{item.detail}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ArchitectureDiagram() {
  return (
    <div className={s.architecture}>
      <div className={s.layers}>
        {ARCHITECTURE.layers.map((layer, index) => (
          <div key={layer.name} className={s.layer}>
            <span className={s.layerName}>{layer.name}</span>
            <div className={s.layerItems}>
              {layer.items.map((item) => (
                <span key={item} className={s.layerItem}>
                  {item}
                </span>
              ))}
            </div>
            {index < ARCHITECTURE.layers.length - 1 && (
              <div className={s.layerConnector} />
            )}
          </div>
        ))}
      </div>
      <div className={s.integrationsSidebar}>
        <span className={s.integrationsLabel}>Optional</span>
        <div className={s.integrationsList}>
          {ARCHITECTURE.integrations.map((integration) => (
            <span key={integration} className={s.integrationItem}>
              {integration}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className={cn(s.section, 'dr-layout-grid')}>
      <div className="col-span-full dt:col-start-2 dt:col-end-12">
        <header className={s.header}>
          <h2 className={s.title}>Features</h2>
          <p className={s.subtitle}>
            Tools for performance-critical creative development.
          </p>
        </header>

        <div className={s.content}>
          <div className={s.problemsSection}>
            <h3 className={s.sectionTitle}>Problems We Solve</h3>
            <ProblemSolutionTable />
          </div>

          <div className={s.architectureSection}>
            <h3 className={s.sectionTitle}>Architecture</h3>
            <ArchitectureDiagram />
          </div>
        </div>

        <div className={s.cta}>
          <div className={s.ctaContent}>
            <code className={s.command}>
              bunx degit darkroomengineering/satus my-project
            </code>
            <span className={s.hint}>
              Then run <code>bun run setup:project</code> to configure
            </span>
          </div>
        </div>

        <div className={s.footer}>
          <Link
            href="https://github.com/darkroomengineering/satus#readme"
            className={s.docsLink}
          >
            View documentation →
          </Link>
        </div>
      </div>
    </section>
  )
}
