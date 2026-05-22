module.exports = {
  apps: [
    {
      name: 'data2metrics',
      script: './index.js',
      cwd: '/home/breackey/apps/Data2Metrics',
      env_file: '/home/breackey/apps/Data2Metrics/.env',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};