module.exports = {
  "presets": [
    [
      "@babel/env", {
        "debug": true,
        "targets": {
          "browsers": "extends @ladjs/browserslist-config"
        }
      }
    ]
  ],
  "ignore": [ /[\/\\]core-js/, /@babel[\/\\]runtime/ ],
  "plugins": [ "@babel/transform-runtime" ],
  "sourceMaps": "both"
};
