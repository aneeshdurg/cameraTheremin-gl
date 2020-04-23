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

uniform int u_x_start;
uniform int u_x_end;
uniform int u_y_start;
uniform int u_y_end;

uniform sampler2D u_texture;

out vec4 color_out;

void main() {
    int x = u_src_width - int(gl_FragCoord.x);
    int y = u_src_height - int(gl_FragCoord.y);
    vec4 texColor = texelFetch(u_texture, ivec2(x, y), 0);

    if (gl_FragCoord.x < float(u_x_start) ||
            gl_FragCoord.x > float(u_x_end) ||
            gl_FragCoord.y < float(u_y_start) ||
            gl_FragCoord.y > float(u_y_end)) {
        color_out = texColor;
        return;
    }

    float lumin = 0.21 * texColor.r +0.72 * texColor.b + 0.07 * texColor.g;
    color_out = vec4(lumin, lumin, lumin, 1.0);
}
