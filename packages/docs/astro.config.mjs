import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.inbrx.dev',
  integrations: [
    starlight({
      title: 'inbrx',
      description: 'Local SMTP testing environment for capturing and inspecting test emails.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/shuaixr/inbrx'
        }
      ],
      editLink: {
        baseUrl: 'https://github.com/shuaixr/inbrx/edit/master/packages/docs/'
      },
      sidebar: [
        {
          label: 'Start',
          items: [
            { label: 'Quick Start', slug: 'quick-start' },
            { label: 'Docker', slug: 'docker' },
            { label: 'Connect Your App', slug: 'connect-your-app' }
          ]
        },
        {
          label: 'Guide',
          items: [
            { label: 'Web UI', slug: 'web-ui' },
            { label: 'Storage', slug: 'storage' },
            { label: 'STARTTLS', slug: 'starttls' }
          ]
        },
        {
          label: 'Reference',
          items: [
            { label: 'CLI Reference', slug: 'cli-reference' },
            { label: 'Environment Variables', slug: 'environment-variables' },
            { label: 'HTTP API', slug: 'http-api' }
          ]
        },
        {
          label: 'Help',
          items: [{ label: 'FAQ', slug: 'faq' }]
        }
      ]
    })
  ]
});
