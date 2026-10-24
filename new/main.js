import { Paint, PAINT_TOOLS } from './paint.js'
import { setupSubmission } from './submit.js'
import { Toolbox } from './toolbox.js'
import { isSafari } from './util.js'

const container = document.querySelector('main')
const containerRect = container.getBoundingClientRect()
const paint = new Paint(
    document.querySelector('canvas'),
    document.querySelector('.canvas-container'), 
    document.querySelector('.canvas-transform-container'),
    document.querySelector('.brush-cursor'),
)

const toolbox = new Toolbox({
    fullscreen: document.querySelector('.fullscreen'),

    tools: {
        brush: document.querySelector('.tool.brush'),
        fill: document.querySelector('.tool.fill'),
        replace: document.querySelector('.tool.replace'),
        colorpicker: document.querySelector('.tool.colorpicker'),
    },
    toolDisplay: document.querySelector('.tool-display'),

    brushSize: document.querySelector('.brush-size'),
    brushSizeDisplay: document.querySelector('.brush-size-display'),

    brushSmall: document.querySelector('.brush-size-preset.small'),
    brushMedium: document.querySelector('.brush-size-preset.medium'),
    brushLarge: document.querySelector('.brush-size-preset.large'),

    brushSubtract: document.querySelector('.brush-size-set.subtract'),
    brushAdd: document.querySelector('.brush-size-set.add'),

    undo: document.querySelector('.undo'),
    redo: document.querySelector('.redo'),
    zoomOut: document.querySelector('.zoom-out'),
    zoomIn: document.querySelector('.zoom-in'),
    resetTransform: document.querySelector('.reset-transform'),

    primaryColorDisplay: document.querySelector('.color.primary'),
    secondaryColorDisplay: document.querySelector('.color.secondary'),
    primaryColorInput: document.querySelector('.color-input.primary'),
    secondaryColorInput: document.querySelector('.color-input.secondary'),
    swapColors: document.querySelector('.swap-colors'),
})

paint.messageBroadcaster.addReceiver(toolbox.messageReceiver)
toolbox.messageBroadcaster.addReceiver(paint.messageReceiver)
toolbox.messageBroadcaster.addReceiver(paint.canvas.inputHandler.messageReceiver)


paint.setupDefaults({
    tool: PAINT_TOOLS.brush,
    brushSize: 4,
    primaryColor: [0, 0, 0],
    secondaryColor: [255, 255, 255],

    minBrushSize: parseInt(toolbox.elements.brushSize.getAttribute('min')),
    maxBrushSize: parseInt(toolbox.elements.brushSize.getAttribute('max')),
})

if (isSafari) {
    toolbox.elements.primaryColorInput.classList.add('safari')
    toolbox.elements.secondaryColorInput.classList.add('safari')

    toolbox.elements.primaryColorDisplay.classList.add('safari')
    toolbox.elements.secondaryColorDisplay.classList.add('safari')
}

// paint.canvas.drawLine([0, 0], [250, 250], 4)
// const p1 = performance.now()
// for (let x = 0; x < 600; x++) {
//     for (let y = 0; y < 400; y++) {
//         paint.canvas.setPixel(x, y, [255, 0, 0])
//     }
// }
// paint.canvas.updateCanvas()
// const p2 = performance.now()

// console.log(p2-p1)

// const p1 = performance.now()

// paint.canvas.drawLine([250, 0], [0, 0], 6, [255, 0, 0])
// paint.canvas.updateCanvas()

// const p2 = performance.now()
// console.log(p2-p1)

// paint.scaleCanvasAroundPivotPoint(0.5, [300, 200])
// paint.scaleCanvasAroundPivotPoint(1, [300, 200])
// setTimeout(() => paint.scaleCanvasAroundPoint(1.25, [100, 100]), 250)
// setTimeout(() => paint.scaleCanvasAroundPoint(2, [100, 100]), 750)
// paint.scaleCanvasAroundPivotPoint(1, [300, 200])
// setTimeout(() => paint.scaleCanvasAroundPoint(2.5, [200, 100]), 1250)
// setTimeout(() => paint.scaleCanvasAroundPoint(3.5, [100, 100]), 1350)
// setTimeout(() => paint.scaleCanvasAroundPivotPoint(1, [200, 100]), 1550)
// setTimeout(() => paint.scaleCanvasAroundPivotPoint(3, [200, 100]), 1750)

// app scaling

function updateScale() {
    const scale = Math.min(
        window.innerWidth / containerRect.width,
        window.innerHeight / containerRect.height,
    )

    container.style.scale = scale
}

updateScale()
window.addEventListener('resize', updateScale)

// modal
const helpModal = document.querySelector('.help-modal')
document.querySelector('.open-help-modal').addEventListener('click', () => {
    helpModal.classList.remove('hidden')
})
document.querySelector('.close-help-modal').addEventListener('click', () => {
    helpModal.classList.add('hidden')
})

document.querySelector('.help-modal-toolbox').addEventListener('click', () => {
    helpModal.querySelectorAll('.page').forEach((el) => el.classList.add('hidden'))
    helpModal.querySelector('.page.toolbox').classList.remove('hidden')
})
document.querySelector('.help-modal-controls').addEventListener('click', () => {
    helpModal.querySelectorAll('.page').forEach((el) => el.classList.add('hidden'))
    helpModal.querySelector('.page.controls').classList.remove('hidden')
})

// submission
setupSubmission(
    paint.canvas.canvas,
    paint.canvas.ctx, 
    document.querySelector('.submission-text'), 
    document.querySelector('.submit')
)

// leaving warning
window.onbeforeunload = (event) => {
    event.preventDefault()
    return 'oops'
}