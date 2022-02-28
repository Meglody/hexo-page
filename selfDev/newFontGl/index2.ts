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
const preSets = ["hello world", "el psy kongroo", `${new Date().toLocaleDateString()}`, 
    `let angle = 0\n\r
    let value\n\r
    const step = () =\> {\n\r
        angle++\n\r
        value = Math.abs(Math.sin(angle))\n\r
        requestAnimationFrame(() =\> step())\n\r
    }\n\r
    `
]
const text = ref(preSets[Math.floor(Math.random()*4)])
const cursor = ref("_")
const calculate = () => {
    const ret = parseFloat((Math.random() * 0.14).toFixed(2))
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
        fontSize: Math.max(32, 150 / Math.ceil(text.value.length / 30)),
        color: colors.value,
        //the triangulation function, use the default poly2tri
        triangulate: triangulate,
        text: text.value + cursor.value,
        align: 'left',
        mode: gl.LINE_STRIP
    })
}

const projection = mat4.create()
// 视野，观察空间的大小,如果想要一个真实的观察效果，它的值通常设置为45.0f
const fieldOfView = 45 * Math.PI / 180
// 设置了平截头体的近和远平面。我们通常设置近距离为0.1f，而远距离设为100.0f。
const zNear = 0
const zFar = 100.0
let renderer = createRenderer()

const render = (gl: WebGLRenderingContext) => {
    const width = canvas.width
    const height = canvas.height
    // 宽高比，由视口的宽除以高所得
    const aspect = width / height

    gl.clearColor(1,.3,0,0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    let pad = 20
    renderer.layout(window.innerWidth-pad*2); 

    //renderer expects upper-left origin 
    // const p = mat4.perspective(projection,fieldOfView,aspect,zNear,zFar)
    mat4.ortho(projection, 0, width, height, 0, 0, 1)
    renderer.projection = projection

    let b = renderer.getBounds()
    let x = width/2 - b.width/2,
        y = height/2 - b.height/2 - b.y

    renderer.draw(x, y)
} 

const cursorShow = ref<boolean>(false)
const blinkCursor = () => {
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

document.body.addEventListener('keypress', e => {
    e.preventDefault()
    text.value += e.key.length === 1 ? e.key : '\n\r'
})
let lastDown = ''
document.body.addEventListener('keydown', e => {
    if(lastDown + e.key === 'ControlBackspace' || lastDown + e.key === 'MetaBackspace'){
        console.log('删除一行')
        deleteLine()
    }else{
        lastDown = e.key
    }
})
document.body.addEventListener('keyup', e => {
    if(e.key === 'Backspace' && text.value){
        while(text.value.endsWith('\n\r')){
            text.value = text.value.slice(0, -2)
        }
        text.value = text.value.slice(0, -1)
    }
    if(e.key === 'Control' || e.key === 'Meta'){
        lastDown = ''
    }
})

const deleteLine = () => {
    while(text.value && !text.value.endsWith('\n\r')){
        text.value = text.value.slice(0, -1)
    }
    while(text.value.endsWith('\n\r')){
        text.value = text.value.slice(0, -2)
    }
}