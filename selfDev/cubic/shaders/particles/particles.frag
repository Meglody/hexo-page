precision mediump float;
void main(){
    float dist = distance(gl_PointCoord, vec2(0.5, 0.5));
    if(dist < 0.5){
        gl_FragColor = vec4(0.87, 0.91, 1.0, 0.8);
    }else{
        discard;
    }
}