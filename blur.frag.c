#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
precision highp int;
#else
precision mediump float;
precision mediump int;
#endif

uniform int u_src_width;
uniform int u_src_height;
uniform sampler2D u_texture;
uniform float u_threshold;

uniform int u_x_start;
uniform int u_x_end;
uniform int u_y_start;
uniform int u_y_end;

uniform vec3 u_color;

out vec4 color_out;

void main() {
    int x = int(gl_FragCoord.x);
    int y = int(gl_FragCoord.y);
    if (x < u_x_start || x > u_x_end || y < u_y_start || y > u_y_end) {
        color_out = texelFetch(u_texture, ivec2(x, y), 0);
        return;
    }

    float upleft = texelFetch(u_texture, ivec2(x - 1, y - 1), 0).r;
    float left = texelFetch(u_texture, ivec2(x - 1, y), 0).r;
    float downleft = texelFetch(u_texture, ivec2(x - 1, y + 1), 0).r;

    float upright = texelFetch(u_texture, ivec2(x + 1, y - 1), 0).r;
    float right = texelFetch(u_texture, ivec2(x + 1, y), 0).r;
    float downright = texelFetch(u_texture, ivec2(x + 1, y + 1), 0).r;

    float up = texelFetch(u_texture, ivec2(x, y - 1), 0).r;
    float self = texelFetch(u_texture, ivec2(x, y), 0).r;
    float down = texelFetch(u_texture, ivec2(x, y + 1), 0).r;

    float blurVal =
        upleft   * 0.095 + up   * 0.118 + upright     * 0.095 +
        left     * 0.118 + self * 0.147 + right       * 0.118 +
        downleft * 0.095 + down * 0.118 + downright   * 0.095;

    if (blurVal > u_threshold)
        color_out = vec4(0.0, 0.0, 0.0, 1.0);
    else
        color_out = vec4(u_color, 1.0);
}
