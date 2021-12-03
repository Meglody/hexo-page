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
declare module '*.glsl'