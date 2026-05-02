module.exports = {
  apps: [{
    name: 'peter-website',
    script: 'npx',
    args: 'serve dist -l 3000',
    cwd: '/home/ubuntu/peter-website',
    env: {
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M'
  }]
};