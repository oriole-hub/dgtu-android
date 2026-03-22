/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Обязателен для react-native-reanimated / worklets — всегда последним в списке
      'react-native-reanimated/plugin',
    ],
  };
};
