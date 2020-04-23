async function loadTwgl() {
    const p = new Promise((resolve) => {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://twgljs.org/dist/4.x/twgl-full.min.js";
        script.onreadystatechange = resolve;
        script.onload = resolve;
        document.head.appendChild(script);
    });
    return p;
}

_fileCache = {}
async function getFile(url) {
    if (url in _fileCache)
        return _fileCache[url];

    const resp = await fetch(url);
    if (resp.status !== 200)
        throw("Could not find shader " + url);

    let fileContents = "";
    const reader = resp.body.getReader();
    done = false;
    while (!done) {
        let fileBody = await reader.read();
        if (!fileBody.value) {
            done = true;
        } else {
            fileContents += String.fromCharCode.apply(null, fileBody.value);
        }
    }
    _fileCache[url] = fileContents;
    return fileContents;
}

function enableGlExts(gl) {
    gl.getExtension('OES_texture_float');        // just in case
    gl.getExtension('OES_texture_float_linear');
    ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
        alert("no ext color...");
        throw new Error("!");
    }
}

const vs = `
    #version 300 es
    in vec4 position;
    void main() {
      gl_Position = position;
    }`;

const bufferArrays = {
    position: {
        data: [
          -1, -1,
           1, -1,
          -1,  1,
          -1,  1,
           1, -1,
           1,  1,
        ],
        numComponents: 2,
    },
};

const dimensions = [640, 480];

function setupProgram(gl, programInfo, bufferInfo) {
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
}

function updateTexture(tex, data) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0, // level
        gl.RGBA, // internal format
        dimensions[0], // width
        dimensions[1], // height
        0, // border
        gl.RGBA, // format
        gl.UNSIGNED_BYTE, // type
        data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
}

/**
 * @param gl webgl2 instance
 * @param dimensions [width, height] tuple for texture dimensions
 * @param data - can be null, if not will be used as the source for the texture
 */
function createTexture(gl, dimensions, data) {
    const tex = gl.createTexture();
    updateTexture(tex, data);
    return tex;
}

var gl = null;
let video = null;
let videoTexture = null;

let greyDst = null;
let greyDstBuffer = null;

let parameters = {
    threshold: 0,
    x: {
        start: 0,
        end: 0,
    },
    y: {
        start: 0,
        end: 0,
    },
    color: new Float32Array([1, 1, 1]),
};

function setupParameterEvents() {
    const threshold = document.getElementById("threshold");
    threshold.addEventListener("input", () => {
        parameters.threshold = Number(threshold.value) / 256;
    });
    threshold.dispatchEvent(new Event("input"));

    const xstart = document.getElementById("xstart");
    xstart.addEventListener("input", () => {
        const val = Number(xstart.value);
        if (val > parameters.x.end)
            xstart.value = parameters.x.end - 1;
        else
            parameters.x.start = val;
    });
    xstart.dispatchEvent(new Event("input"));

    const xend = document.getElementById("xend");
    xend.addEventListener("input", () => {
        const val = Number(xend.value);
        if (val < parameters.x.start) {
            xend.value = parameters.x.start + 1;
        } else
            parameters.x.end = val;
    });
    xend.dispatchEvent(new Event("input"));

    const ystart = document.getElementById("ystart");
    ystart.addEventListener("input", () => {
        const val = Number(ystart.value);
        if (val > parameters.y.end)
            ystart.value = parameters.y.end - 1;
        else
            parameters.y.start = val;
    });
    ystart.dispatchEvent(new Event("input"));

    const yend = document.getElementById("yend");
    yend.addEventListener("input", () => {
        const val = Number(yend.value);
        if (val < parameters.y.start)
            yend.value = parameters.y.start + 1;
        else
            parameters.y.end = val;
    });
    yend.dispatchEvent(new Event("input"));
}

function draw() {
    const offset = 0;
    const numVertices = 6;
    gl.drawArrays(gl.TRIANGLES, offset, numVertices);
}

function render() {
    updateTexture(videoTexture, video);

    const args = {
        u_src_width: canvas.width,
        u_src_height: canvas.height,
        u_x_start: parameters.x.start,
        u_y_start: parameters.y.start,
        u_x_end: parameters.x.end,
        u_y_end: parameters.y.end,
        u_color: parameters.color,
    };

    gl.useProgram(greyscaleProg.program);
    args.u_texture = videoTexture;
    twgl.setUniforms(greyscaleProg, args);
    gl.bindFramebuffer(gl.FRAMEBUFFER, greyDstBuffer);
    draw();

    gl.useProgram(blurProg.program);
    args.u_texture = greyDst;
    args.u_threshold = parameters.threshold;
    twgl.setUniforms(blurProg, args);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    draw();

    const activeWidth = parameters.x.end - parameters.x.start;
    const activeHeight = parameters.y.end - parameters.y.start;
    const numPx = activeWidth * activeHeight;
    let data = new Uint8Array(numPx * 4);
    gl.readPixels(
        parameters.x.start,
        parameters.y.start,
        activeWidth,
        activeHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data);
    let numActivePx = 0;
    for (let i = 0; i < numPx; i++)
        numActivePx += data[4 * i] == 0 ? 0 : 1;
    const activePx = numActivePx / numPx;

    let freq = Math.abs(activePx * 256 - 220);
    freq /= 11;
    freq += 7;
    freq *= 0.3;
    let r = Math.round(Math.sin(freq + 0) * 127 + 128); //.toString(16).padStart(2, "0");
    let g = Math.round(Math.sin(freq + 2) * 127 + 128); //.toString(16).padStart(2, "0");
    let b = Math.round(Math.sin(freq + 4) * 127 + 128); //.toString(16).padStart(2, "0");
    parameters.color[0] = r / 256;
    parameters.color[1] = g / 256;
    parameters.color[2] = b / 256;
}

async function renderloop() {
    updateTexture(videoTexture, video);

    if (!(parameters.x.start > parameters.x.end && paramters.y.start > paramters.y.end))
        render();
    else
        console.log("!");

    requestAnimationFrame(renderloop);
}

async function startStream(stream){
	video.srcObject = stream;

    let started = false;
	video.play();
    await new Promise(r => {
        video.addEventListener('timeupdate', () => {
            if (!started) {
                started = true;
                r();
            }
        });
    });

    renderloop();
}

async function initialize(canvas, root){
    await loadTwgl();
    setupParameterEvents();

    canvas.width = dimensions[0];
    canvas.height = dimensions[1];
    gl = canvas.getContext("webgl2", {premultipliedAlpha: false});
    if (!gl)
        throw new Error("Could not initialize webgl2 context! Does your browser support webgl2?");
    enableGlExts(gl);

    const greyShader = await getFile(root + "/greyscale.frag.c");
    window.greyscaleProg = twgl.createProgramInfo(gl, [vs, greyShader]);

    greyDst = createTexture(gl, dimensions, null);
    greyDstBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, greyDstBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, greyDst, 0 /* level */);

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, bufferArrays);
    setupProgram(gl, greyscaleProg, bufferInfo);

    const blurShader = await getFile(root + "/blur.frag.c");
    window.blurProg = twgl.createProgramInfo(gl, [vs, blurShader]);
    setupProgram(gl, blurProg, bufferInfo);

    videoTexture = createTexture(gl, dimensions, null);

    video = document.createElement("video");
	const constraints = {
		video: {
			mandatory: {
				maxWidth: dimensions[0],
				maxHeight: dimensions[1]
			}
		}
	}
	navigator.getUserMedia(constraints, startStream, function(){});
}

addEventListener("DOMContentLoaded", () => { initialize(document.getElementById("canvas"), "."); });
