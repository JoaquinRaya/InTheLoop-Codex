/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-core-to-adapters',
      comment: 'Core must not depend on adapters',
      from: { path: '^packages/core' },
      to: { path: '^packages/adapters' }
    },
    {
      name: 'no-domain-to-ports',
      comment: 'Core domain must not depend on core ports',
      from: { path: '^packages/core/src/domain' },
      to: { path: '^packages/core/src/ports' }
    },
    {
      name: 'no-driven-adapter-cross-imports',
      comment: 'Driven adapters must stay isolated from each other',
      from: { path: '^packages/adapters/src/driven/([^/]+)' },
      to: {
        path: '^packages/adapters/src/driven/([^/]+)',
        pathNot: '^packages/adapters/src/driven/$1'
      }
    }
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: {
      path: 'node_modules'
    }
  }
};
