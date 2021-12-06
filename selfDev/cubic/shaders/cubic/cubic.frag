precision mediump float;
uniform sampler2D u_cubic_Sampler;
varying vec2 v_cubic_Pin;

void main(){
    gl_FragColor = texture2D(u_cubic_Sampler, v_cubic_Pin);
}