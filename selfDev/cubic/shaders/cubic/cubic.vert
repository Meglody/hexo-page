attribute vec4 a_cubic_Position;
attribute vec2 a_cubic_Pin;
uniform mat4 u_cubic_ModelMatrix;
varying vec2 v_cubic_Pin;
void main(){
    gl_Position = u_cubic_ModelMatrix * a_cubic_Position;
    v_cubic_Pin = a_cubic_Pin;
}