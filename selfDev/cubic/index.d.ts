// import { FilterPattern } from '@rollup/pluginutils';
// import { Plugin } from 'rollup';

type pic = string
declare module '*.svg' {
    const svg: pic
    export default svg
}
declare module '*.png' {
    const png: pic
    export default png
}
declare module '*.jpg' {
    const jpg: pic
    export default jpg
}
declare module '*.jpeg' {
    const jpeg: pic
    export default jpeg
}
declare module '*.gif' {
    const gif: pic
    export default gif
}
declare module '*.vert'
declare module '*.frag'
declare module '*.vs'
declare module '*.fs'
declare module '*.glsl'

// interface RollupGLSLOptions {
//   /**
//    * A minimatch pattern, or array of patterns, which specifies the files in the build the plugin
//    * should operate on.
//    * By default all files are targeted.
//    */
//   include?: FilterPattern;
//   /**
//    * A minimatch pattern, or array of patterns, which specifies the files in the build the plugin
//    * should _ignore_.
//    * By default no files are ignored.
//    */
//   exclude?: FilterPattern;
//   /**
//    * If `false`, shader will not compressed by using logic from rollup-plugin-glsl.
//    * @default true
//    */
//    compress?: boolean;
// }

// export default function glslify(options?: RollupGLSLOptions): Plugin;

declare module 'rollup-plugin-glslify';