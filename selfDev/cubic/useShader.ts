interface locationInfoType {
    name: string
    size: number
    index: number
}
export interface locationType {
    location: number
    size: number
    index: number
}
const initShaders = (gl: WebGLRenderingContext, vsSource: string, fsSource: string, locations: locationInfoType[]) : {
    program: WebGLProgram
    locations: locationType[]
} => {
    // 创建程序对象（编译，翻译js和glsl es语言的介质）
    const program = gl.createProgram() as WebGLProgram
    // @ts-ignore
    program.source = vsSource
    // 建立着色对象
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource) as WebGLShader
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource) as WebGLShader
    // 把顶点着色器对象装入程序对象中
    gl.attachShader(program, vertexShader)
    // 把片元着色器对象装入程序对象中
    gl.attachShader(program, fragmentShader)
    // 连接webgl上下文对象和程序对象
    gl.linkProgram(program)
    // 启动程序对象
    gl.useProgram(program)
    console.log(gl.CURRENT_PROGRAM)
    const ret = locations.map(({name, size, index}) => {
        return {
            location: gl.getAttribLocation(program, name),
            size,
            index
        }
    })
    return {
        program,
        locations: ret
    }
}
const loadShader = (gl: WebGLRenderingContext, shaderType: number, source: string) => {
    // 根据着色器类型，建立着色器对象
    const shader = gl.createShader(shaderType) as WebGLShader
    // 将着色器源文件传入着色器对象中
    gl.shaderSource(shader, source)
    // 编译着色器对象
    gl.compileShader(shader)
    return shader
}
export default {
    loadShader,
    initShaders
}