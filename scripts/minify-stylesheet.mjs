import CleanCSS from 'clean-css';

export function minifyStylesheet(input, sourceMap = false) {
  const result = new CleanCSS({
    level: { 1: { optimizeBackground: false } },
    inline: false,
    rebase: false,
    sourceMap,
    sourceMapInlineSources: sourceMap,
  }).minify(input);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  return result;
}
