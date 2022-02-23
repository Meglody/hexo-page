import TestFont from 'fontpath-test-fonts/lib/OpenSans-Regular.ttf'
import createText from 'fontpath-gl'
import triangulate from 'fontpath-gl/triangulate'
import mat4 from 'gl-mat4'
import { ref } from 'vue'
const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
const bannerWrapper = document.querySelector('#banner')
bannerWrapper!.appendChild(canvas)
let gl = canvas.getContext('webgl') as WebGLRenderingContext
const simplifyAmount = ref(0)
const colors = ref([1,1,1,1])
const text = ref("el psy kongroo")
const cursor = ref("_")
const calculate = () => {
    const ret = parseFloat((Math.random() * 0.19).toFixed(2))
    simplifyAmount.value = ret
    // const r = parseFloat((Math.random() * 0.1 + 0.8).toFixed(2))
    // const g = parseFloat((Math.random() * 0.1 + 0.6).toFixed(2))
    // const b = parseFloat((Math.random() * 0.1 + 0.4).toFixed(2))
    // colors.value = [r, g, b, 1]
}

const createRenderer = () => {
    calculate()
    return createText(gl, {
        fill: true,
        simplifyAmount: simplifyAmount.value,
        font: TestFont,
        fontSize: 150,
        color: colors.value,
        //the triangulation function, use the default poly2tri
        triangulate: triangulate,
        text: text.value + cursor.value,
        align: 'left',
        mode: gl.LINE_STRIP
    })
}

const ortho = mat4.create()
let renderer = createRenderer()

const render = (gl: WebGLRenderingContext) => {
    const width = canvas.width
    const height = canvas.height
    gl.clearColor(0,0,0,0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    let pad = 20
    renderer.layout(window.innerWidth-pad*2); 

    //renderer expects upper-left origin 
    mat4.ortho(ortho, 0, width, height, 0, 0, 1)
    renderer.projection = ortho

    let b = renderer.getBounds()
    let x = width/2 - b.width/2,
        y = height/2 - b.height/2 - b.y

    renderer.draw(x, y)
} 

const cursorShow = ref<boolean>(false)
// const allowBlink = ref(true)
const blinkCursor = () => {
    // if(!allowBlink.value){
    //     if(cursorShow.value && text.value.slice(-1) === '_'){
    //         text.value = text.value.slice(0, -1)
    //     }
    //     return
    // }
    if(!cursorShow.value){
        cursor.value = '_'
        cursorShow.value = true
    }else{
        cursor.value = ''
        cursorShow.value = false
    }
}


render(gl)

// 15帧运行的动画
const timestamp_15 = ref(0)
// 2帧运行的动画
const timestamp_2 = ref(0)

const ani = (ts?: number) => {
    if(!!ts){
        if(!timestamp_15.value || ts - timestamp_15.value > 67.6){
            timestamp_15.value = ts
            renderer = createRenderer()
        }
        if(!timestamp_2.value || ts - timestamp_2.value > 500){
            timestamp_2.value = ts
            blinkCursor()
        }
    }
    render(gl)
    requestAnimationFrame((ts) => ani(ts))
}

ani()

let blinkThrottleTimer: NodeJS.Timeout | null = null
// document.addEventListener('keydown', e => {
//     allowBlink.value = false
//     blinkThrottleTimer && clearTimeout(blinkThrottleTimer)
//     blinkThrottleTimer = setTimeout(() => {
//         allowBlink.value = true
//     }, 1000);
//     let code = e.keyCode;
//     let chr = String.fromCharCode(code).toLowerCase();
//     if (code === 8) {
//         // backspace
//         text.value = text.value.slice(0, -1);
//     } else {
//         if (chr) {
//             text.value += chr;
//         }
//     }
// })
const textarea = document.createElement('textarea')
textarea.style.display = 'none'
textarea.onchange = e => {
    console.log(e)
}
document.body.appendChild(textarea)
canvas.addEventListener('click', () => textarea.focus())