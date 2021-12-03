interface locationInfoType {
    name: string;
    size: number;
    index: number;
}
export interface locationType {
    location: number;
    size: number;
    index: number;
}
declare const _default: {
    loadShader: (gl: WebGLRenderingContext, shaderType: number, source: string) => WebGLShader;
    initShaders: (gl: WebGLRenderingContext, vsSource: string, fsSource: string, locations: locationInfoType[]) => {
        program: WebGLProgram;
        locations: locationType[];
    };
};
export default _default;
