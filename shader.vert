attribute vec4 v_pos;
attribute vec4 v_sRGB;
uniform mat4 modelViewProjectionMatrix;

varying vec4 f_sRGB;

void main() {
    gl_Position = modelViewProjectionMatrix * v_pos;
    f_sRGB = v_sRGB;
}
