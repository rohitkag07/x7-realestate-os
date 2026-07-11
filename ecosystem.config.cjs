const root = __dirname;

const common = {
  interpreter: 'node',
  autorestart: true,
  watch: false,
  max_memory_restart: '512M',
};

module.exports = {
  apps: [
    {
      ...common,
      name: 'x7-sales-agent',
      cwd: `${root}/agents/x7-re-sales-agent`,
      script: 'index.js',
      interpreter_args: `--env-file=${root}/agents/x7-re-sales-agent/.env`,
    },
    {
      ...common,
      name: 'x7-tool-gateway',
      cwd: `${root}/agents/x7-re-tool-gateway`,
      script: 'index.js',
      interpreter_args: `--env-file=${root}/agents/x7-re-tool-gateway/.env`,
    },
    {
      ...common,
      name: 'x7-summoner',
      cwd: `${root}/agents/x7-re-summoner`,
      script: 'index.js',
      interpreter_args: `--env-file=${root}/agents/x7-re-summoner/.env`,
    },
  ],
};
