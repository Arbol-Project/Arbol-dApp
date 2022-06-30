/* craco.config.js */
const CracoLessPlugin = require('craco-less');

module.exports = {
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: { 
              '@border-radius-base': '8px',
              // '@font-family': 'Barlow',
              // '@font-family': 'Space Mono'
              // '@pagination-item-bg': 'FAFAFA',
            },
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
};
