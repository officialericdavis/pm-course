module.exports = {
  apps: [{
    name: 'your-app',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/peter-website',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};