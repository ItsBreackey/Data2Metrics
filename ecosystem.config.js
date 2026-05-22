module.exports = {
  apps: [
    {
      name: 'data2metrics',
      script: './index.js',
      cwd: '/home/breackey/apps/Data2Metrics',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};