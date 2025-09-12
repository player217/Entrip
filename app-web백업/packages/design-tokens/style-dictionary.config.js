module.exports = {
  source: ['src/tokens.json'],
  platforms: {
    tailwind: {
      transformGroup: 'js',
      buildPath: 'build/',
      files: [{
        destination: 'tailwind.js',
        format: 'javascript/es6'
      }]
    },
    css: {
      transformGroup: 'css',
      buildPath: 'build/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables'
      }]
    },
    scss: {
      transformGroup: 'scss',
      buildPath: 'build/',
      files: [{
        destination: 'variables.scss',
        format: 'scss/variables'
      }]
    },
    typescript: {
      transformGroup: 'js',
      buildPath: 'build/',
      files: [{
        destination: 'tokens.ts',
        format: 'javascript/es6'
      }]
    }
  }
};
