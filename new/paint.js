import { DrawingCanvas } from './drawingcanvas.js'
import { EventHandler } from './eventhandler.js'
import { History } from './history.js'
import { Event, MessageBroadcaster, MessageReceiver } from './message.js'
import { clamp, unlerp } from './util.js'

// TODO: add eraser, save brush sizes for brush and eraser
// TODO: make colorpicker constantly pick colors when holding pointer button

function convertRawPositionToElementSpace(position, element) {
    let rect = element.getBoundingClientRect()

    let x = unlerp(rect.x, rect.x + rect.width, position[0]) * 600
    let y = unlerp(rect.y, rect.y + rect.height, position[1]) * 400

    return [Math.floor(x), Math.floor(y)]
}
function convertEventPositionToElementSpace(event, element) {
    let rect = element.getBoundingClientRect()

    // console.log(rect.x, rect.y, rect.width, rect.height)
    // console.log(event.clientX, event.clientY)

    let x = unlerp(rect.x, rect.x + rect.width, event.clientX) * 600
    let y = unlerp(rect.y, rect.y + rect.height, event.clientY) * 400

    return { x: Math.floor(x), y: Math.floor(y) }
}

export const PAINT_TOOLS = {
    brush: 'brush',
    fill: 'fill',
    replace: 'replace',
    colorpicker: 'colorpicker',
}
export const PAINT_TOOL_NAMES = {
    brush: 'brush',
    fill: 'fill',
    replace: 'color replace',
    colorpicker: 'color picker',
}

class BrushCursor {
    constructor(element) {
        this.element = element
    }

    handleToolChanged(tool) {
        switch (tool) {
            case 'fill': {
                this.disable()
                break
            }
            case 'colorpicker': {
                this.disable()
                break
            }
            default: {
                this.enable()
                break
            }
        }
    }

    handleBrushSizeChanged(brushSize) {
        this.setSize(brushSize)
    }

    handlePointerDown(event, position) {
        this.show()
        this.setPosition(position)
    }

    handlePointerMove(event, position) {
        this.show()
        this.setPosition(position)
    }

    handlePointerUp(event, position) {
        if (event.pointerType === 'touch') this.hide()
    }

    hide() {
        this.element.classList.add('hidden')
    }
    show() {
        this.element.classList.remove('hidden')
    }

    disable() {
        this.element.style.opacity = 0
    }
    enable() {
        this.element.style.opacity = 1
    }

    setPosition(position) {
        let x = `calc(-50% + ${position.x}px + 0.5px)`
        let y = `calc(-50% + ${position.y}px + 0.5px)`

        this.element.style.transform = `translate(${x}, ${y})`
    }

    setSize(size) {
        this.element.style.width = size * 2 + 'px'
        this.element.style.height = size * 2 + 'px'
    }
}

export class Paint {
    TOUCH_ZOOM_SCALING = 0.01
    MIN_ZOOM = 0.05
    MAX_ZOOM = 150

    current = {
        tool: PAINT_TOOLS.brush,
        brushSize: 4,
        primaryColor: [0, 0, 0],
        secondaryColor: [255, 255, 255],

        scale: 1,
        translate: [0, 0],
    }
    cachedPrimaryColor = null // for mobile, saves primary color in case you start zooming with the colorpicker selected

    history = new History()

    minBrushSize = 1
    maxBrushSize = 100

    isDrawing = false
    isManipulatingCanvas = false
    isColorpicking = { currently: false, which: null }

    touchGestureInfo = {
        initialDistance: -1,
        initialMidpoint: null,
        initialCanvasMidpoint: null,

        initialCanvasScale: null,
        initialCanvasTranslate: null,

        currentDistance: -1,
        currentMidpoint: null,

        mainScale: null,
    }

    mousePanInfo = {
        initialCanvasTranslate: null,
        initialPosition: null,
        currentPosition: null,

        mainScale: null,
    }

    previousMousePosition = { x: null, y: null }
    mousePosition = { x: 0, y: 0 }

    setCursorStyle(value) {
        this.canvas.canvas.style.cursor = value
    }

    setCursorStyleFromTool(tool) {
        switch (tool) {
            case 'brush': {
                this.setCursorStyle('none')
                break
            }
            case 'replace': {
                this.setCursorStyle('none')
                break
            }
            case 'colorpicker': {
                this.setCursorStyle('crosshair')
                break
            }
            case 'fill': {
                this.setCursorStyle('crosshair')
                break
            }
            default: {
                this.setCursorStyle('auto')
            }
        }
    }

    addEventHandlers() {
        // ----------------- toolbox events
        this.eventHandler.add('userChangedTool', (_, event) => {
            this.currentTool = event.args.tool
            this.stopDrawing()
        })

        this.eventHandler.add('userChangedBrushSize', (_, event) => {
            this.currentBrushSize = event.args.brushSize
        })

        this.eventHandler.add('userChangedPrimaryColor', (_, event) => {
            this.currentPrimaryColor = event.args.color
        })
        this.eventHandler.add('userChangedSecondaryColor', (_, event) => {
            this.currentSecondaryColor = event.args.color
        })

        this.eventHandler.add('userRequestedSwapColors', () => {
            const cPrimary = this.currentPrimaryColor
            const cSecondary = this.currentSecondaryColor

            this.currentPrimaryColor = cSecondary
            this.currentSecondaryColor = cPrimary
        })

        this.eventHandler.add('userRequestedBrushSizeSubtract', () => {
            let step = 1
            if (this.currentBrushSize > 10) step = 5
            if (this.currentBrushSize > 50) step = 10

            this.currentBrushSize = Math.round(this.currentBrushSize / step) * step
            this.currentBrushSize = this.currentBrushSize - step
        })
        this.eventHandler.add('userRequestedBrushSizeAdd', () => {
            let step = 1
            if (this.currentBrushSize > 10) step = 5
            if (this.currentBrushSize > 50) step = 10

            this.currentBrushSize = Math.round(this.currentBrushSize / step) * step
            this.currentBrushSize = this.currentBrushSize + step
        })

        // undo / redo
        this.eventHandler.add('userRequestedUndo', () => {
            this.undo()
        })
        this.eventHandler.add('userRequestedRedo', () => {
            this.redo()
        })

        // reset transform
        this.eventHandler.add('userRequestedResetTransform', () => {
            this.currentScale = 1
            this.currentTranslate = [0, 0]
        })

        // zoom keybinds
        this.eventHandler.add('userRequestedZoomIn', (_, event) => {
            const fromCenter = (
                event.args.fromCenter ||
                this.mousePosition.x < 0 ||
                this.mousePosition.x > 600 ||
                this.mousePosition.y < 0 ||
                this.mousePosition.y > 400
            )
            this.scaleCanvasAroundMouse(-100, fromCenter ? { x: 300, y: 200 } : this.mousePosition)
        })
        this.eventHandler.add('userRequestedZoomOut', (_, event) => {
            const fromCenter = (
                event.args.fromCenter ||
                this.mousePosition.x < 0 ||
                this.mousePosition.x > 600 ||
                this.mousePosition.y < 0 ||
                this.mousePosition.y > 400
            )
            this.scaleCanvasAroundMouse(100, fromCenter ? { x: 300, y: 200 } : this.mousePosition)
        })

        // ----------------- canvas input handling

        // multitouch gesture start
        this.eventHandler.add('touchGestureStart', (_, event) => {
            const points = event.args.points

            let stateChangingTools = ['brush', 'fill', 'replace']
            if (stateChangingTools.includes(this.currentTool)) this.undo()
            if (this.currentTool === 'colorpicker') this.currentPrimaryColor = this.cachedPrimaryColor

            this.startPanZoom(points)
            // console.log(points)
        })
        this.eventHandler.add('touchGestureRecalibrate', (_, event) => {
            const points = event.args.points
            this.startPanZoom(points)
        })
        this.eventHandler.add('touchGestureMove', (_, event) => {
            const points = event.args.points

            this.updatePanZoom(points)
            this.scaleCanvasAroundTouchGesture(this.TOUCH_ZOOM_SCALING)
        })
        this.eventHandler.add('touchGestureEnd', () => {
            this.endPanZoom()
        })

        // pc panning gesture (middle mouse)        
        this.eventHandler.add('mousePanStart', (_, event) => {
            this.startMousePan(event.args.event)
        })
        this.eventHandler.add('mousePanMove', (_, event) => {
            this.updateMousePan(event.args.event)
        })
        this.eventHandler.add('mousePanEnd', () => {
            this.endMousePan()
        })

        this.eventHandler.add('userPreparedMousePan', () => {
            this.brushCursor.disable()
            this.setCursorStyle('move')
        })
        this.eventHandler.add('userUnpreparedMousePan', () => {
            this.brushCursor.enable()
            this.setCursorStyleFromTool(this.currentTool)
        })

        // pc zoom with scroll wheel
        this.eventHandler.add('mousewheel', (_, event) => {
            const pEvent = event.args.event
            const mousePosition = this.getEventPositionInCanvasSpace(pEvent)

            this.scaleCanvasAroundMouse(pEvent.deltaY, mousePosition)
        })

        // regular mouse handling
        this.eventHandler.add('pointerDown', (_, event) => {
            const pEvent = event.args.event
            if (pEvent.pointerType === 'touch' && !pEvent.isPrimary) return

            const mousePosition = this.getEventPositionInCanvasSpace(pEvent)
            this.brushCursor.handlePointerDown(pEvent, mousePosition)

            switch (this.currentTool) {
                case 'brush': {
                    const pos = [mousePosition.x, mousePosition.y]

                    this.startDrawing()

                    this.canvas.drawLine(pos, pos, this.currentBrushSize, this.currentPrimaryColor)
                    this.canvas.updateCanvas()

                    break
                }
                case 'replace': {
                    const pos = [mousePosition.x, mousePosition.y]

                    this.startDrawing()

                    this.canvas.drawLineReplace(pos, pos, this.currentBrushSize, this.currentPrimaryColor, this.currentSecondaryColor)
                    this.canvas.updateCanvas()

                    break
                }
                case 'fill': {
                    const pos = [mousePosition.x, mousePosition.y]

                    this.floodFill(pos, this.currentPrimaryColor)
                    this.canvas.updateCanvas()

                    break
                }
                case 'colorpicker': {
                    const color = this.canvas.getPixel(mousePosition.x, mousePosition.y)

                    switch (pEvent.button) {
                        case 0: { // primary button
                            this.cachedPrimaryColor = this.currentPrimaryColor
                            this.currentPrimaryColor = color
                            break
                        }
                        case 2: { // secondary button
                            this.currentSecondaryColor = color
                            break
                        }
                    }

                    this.startColorpicking(pEvent.button)

                    break
                }
                default: {
                    throw new Error(`undefined behavior "pointerDown" on tool "${this.currentTool}"`)
                }
            }

            // mobileDebugLog('pointerDown')
            this.previousMousePosition = this.getEventPositionInCanvasSpace(pEvent)
        })

        this.eventHandler.add('pointerMove', (_, event) => {
            const pEvent = event.args.event
            if (pEvent.pointerType === 'touch' && !pEvent.isPrimary) return

            const mousePosition = this.getEventPositionInCanvasSpace(pEvent)
            this.mousePosition = mousePosition
            this.brushCursor.handlePointerMove(pEvent, mousePosition)

            switch (this.currentTool) {
                case 'brush': {
                    if (this.isDrawing) {
                        const oldPos = [
                            this.previousMousePosition.x === null ? mousePosition.x : this.previousMousePosition.x,
                            this.previousMousePosition.y === null ? mousePosition.y : this.previousMousePosition.y,
                        ]
                        const newPos = [
                            mousePosition.x,
                            mousePosition.y,
                        ]

                        this.canvas.drawLine(oldPos, newPos, this.currentBrushSize, this.currentPrimaryColor)
                        this.canvas.updateCanvas()
                    }

                    break
                }
                case 'replace': {
                    if (this.isDrawing) {
                        const oldPos = [
                            this.previousMousePosition.x === null ? mousePosition.x : this.previousMousePosition.x,
                            this.previousMousePosition.y === null ? mousePosition.y : this.previousMousePosition.y,
                        ]
                        const newPos = [
                            mousePosition.x,
                            mousePosition.y,
                        ]

                        this.canvas.drawLineReplace(oldPos, newPos, this.currentBrushSize, this.currentPrimaryColor, this.currentSecondaryColor)
                        this.canvas.updateCanvas()
                    }

                    break
                }
                case 'fill': {
                    break
                }
                case 'colorpicker': {
                    const color = this.canvas.getPixel(mousePosition.x, mousePosition.y)

                    if (this.isColorpicking.currently) {
                        switch (this.isColorpicking.which) {
                            case 0: { // primary
                                this.currentPrimaryColor = color
                                break
                            }
                            case 2: { // secondary
                                this.currentSecondaryColor = color
                                break
                            }
                        }
                    }
                    break
                }
                default: {
                    throw new Error(`undefined behavior "pointerMove" on tool "${this.currentTool}"`)
                }
            }

            // mobileDebugLog('pointerMove')
            this.previousMousePosition = this.getEventPositionInCanvasSpace(pEvent)
        })

        this.eventHandler.add('pointerUp', (_, event) => {
            const pEvent = event.args.event
            if (pEvent.pointerType === 'touch' && !pEvent.isPrimary) return

            this.brushCursor.handlePointerUp(pEvent, { x: null, y: null })
            this.previousMousePosition = { x: null, y: null }

            switch (this.currentTool) {
                case 'brush': {
                    this.stopDrawing()
                    break
                }
                case 'replace': {
                    this.stopDrawing()
                    break
                }
                case 'fill': {
                    break
                }
                case 'colorpicker': {
                    this.stopColorpicking()
                    break
                }
                default: {
                    throw new Error(`undefined behavior "pointerMove" on tool "${this.currentTool}"`)
                }
            }

            // mobileDebugLog('pointerUp')
        })
    }

    constructor(canvas, canvasContainer, canvasTransformContainer, brushCursor) {
        this.canvas = new DrawingCanvas(canvas, canvasContainer)
        this.canvasTransformContainer = canvasTransformContainer
        this.brushCursor = new BrushCursor(brushCursor)

        this.eventHandler = new EventHandler(this, 'Paint')
        this.addEventHandlers()

        this.messageBroadcaster = new MessageBroadcaster(this)
        this.messageReceiver = new MessageReceiver(this)

        this.canvas.inputHandler.messageBroadcaster.addReceiver(this.messageReceiver)

        this.history.push(this.canvas.cloneRawImageData())
    }

    setupDefaults(defaults) {
        this.currentTool = defaults.tool
        this.currentBrushSize = defaults.brushSize
        this.currentPrimaryColor = defaults.primaryColor
        this.currentSecondaryColor = defaults.secondaryColor

        this.minBrushSize = defaults.minBrushSize
        this.maxBrushSize = defaults.maxBrushSize
    }

    get currentTool() {
        return this.current.tool
    }
    set currentTool(tool) {
        if (!PAINT_TOOLS[tool]) throw new Error(`invalid tool: ${tool}`)

        this.current.tool = PAINT_TOOLS[tool]
        this.brushCursor.handleToolChanged(PAINT_TOOLS[tool])
        this.setCursorStyleFromTool(this.currentTool)
        this.messageBroadcaster.notify(
            this,
            new Event('toolChanged', { tool: this.current.tool })
        )
    }

    get currentBrushSize() {
        return this.current.brushSize
    }
    set currentBrushSize(brushSize) {
        if (isNaN(parseInt(brushSize))) throw new Error(`invalid brush size: ${brushSize}`)

        brushSize = clamp(brushSize, this.minBrushSize, this.maxBrushSize)

        this.current.brushSize = parseInt(brushSize)
        this.brushCursor.handleBrushSizeChanged(parseInt(brushSize))

        this.messageBroadcaster.notify(
            this,
            new Event('brushSizeChanged', { brushSize: this.current.brushSize })
        )
    }

    get currentPrimaryColor() {
        return this.current.primaryColor
    }
    set currentPrimaryColor(color) {
        // if (!isValidHexColor(color)) throw new Error(`invalid hex color: ${color}`)

        this.current.primaryColor = color
        this.messageBroadcaster.notify(
            this,
            new Event('primaryColorChanged', { color: this.current.primaryColor })
        )
    }

    get currentSecondaryColor() {
        return this.current.secondaryColor
    }
    set currentSecondaryColor(color) {
        // if (!isValidHexColor(color)) throw new Error(`invalid hex color: ${color}`)

        this.current.secondaryColor = color
        this.messageBroadcaster.notify(
            this,
            new Event('secondaryColorChanged', { color: this.current.secondaryColor })
        )
    }

    get currentTranslate() {
        return this.current.translate
    }
    set currentTranslate(translate) {
        this.current.translate = translate
        // this.canvasTransformContainer.style.translate = `${this.current.translate[0]}px ${this.current.translate[1]}px`
        this.canvasTransformContainer.style.transform = `translate(${this.current.translate[0]}px, ${this.current.translate[1]}px) scale(${this.current.scale})`
    }

    get currentScale() {
        return this.current.scale
    }
    set currentScale(scale) {
        // this.canvasTransformContainer.style.scale = scale
        this.current.scale = scale
        this.canvasTransformContainer.style.transform = `translate(${this.current.translate[0]}px, ${this.current.translate[1]}px) scale(${this.current.scale})`
    }

    computeTranslateForScalingAroundPoint(oldScale, oldTranslate, newScale, canvasPosition) {
        const newTranslate = [
            oldTranslate[0] + canvasPosition[0] * (oldScale - newScale),
            oldTranslate[1] + canvasPosition[1] * (oldScale - newScale),
        ]

        return newTranslate
    }
    scaleCanvasAroundPoint(scale, canvasPosition) {
        const oldScale = this.currentScale
        const oldTranslate = this.currentTranslate

        const newTranslate = this.computeTranslateForScalingAroundPoint(oldScale, oldTranslate, scale, canvasPosition)

        this.currentScale = scale
        this.currentTranslate = newTranslate
    }

    floodFill(position, newColor) {
        this.history.confirm()
        this.canvas.floodFill(position, newColor)
        this.history.push(this.canvas.cloneRawImageData())
    }

    startDrawing() {
        this.history.confirm()
        this.isDrawing = true
    }
    stopDrawing() {
        if (this.isDrawing) this.history.push(this.canvas.cloneRawImageData())
        this.isDrawing = false
    }

    startColorpicking(which) {
        this.isColorpicking.currently = true
        this.isColorpicking.which = which
    }
    stopColorpicking() {
        this.isColorpicking.currently = false
        this.isColorpicking.which = null
    }

    startPanZoom(points) {
        const pa = [points[0].clientX, points[0].clientY]
        const pb = [points[1].clientX, points[1].clientY]

        this.touchGestureInfo.initialMidpoint = [
            (pa[0] + pb[0]) / 2,
            (pa[1] + pb[1]) / 2
        ]
        this.touchGestureInfo.initialDistance = Math.hypot(
            pa[0] - pb[0],
            pa[1] - pb[1]
        )
        this.touchGestureInfo.initialCanvasMidpoint = this.convertToCanvasSpace(this.touchGestureInfo.initialMidpoint)

        this.touchGestureInfo.initialCanvasScale = this.currentScale
        this.touchGestureInfo.initialCanvasTranslate = this.currentTranslate

        this.touchGestureInfo.mainScale = this.getMainScale()

        this.startManipulatingCanvas()
        this.brushCursor.disable()
    }
    updatePanZoom(points) {
        const pa = [points[0].clientX, points[0].clientY]
        const pb = [points[1].clientX, points[1].clientY]

        this.touchGestureInfo.currentMidpoint = [
            (pa[0] + pb[0]) / 2,
            (pa[1] + pb[1]) / 2
        ]
        this.touchGestureInfo.currentDistance = Math.hypot(
            pa[0] - pb[0],
            pa[1] - pb[1]
        )
    }
    endPanZoom() {
        this.touchGestureInfo.initialDistance = -1
        this.touchGestureInfo.currentDistance = -1

        this.touchGestureInfo.initialMidpoint = null
        this.touchGestureInfo.currentMidpoint = null
        this.touchGestureInfo.initialCanvasMidpoint = null

        this.touchGestureInfo.initialCanvasScale = null
        this.touchGestureInfo.initialCanvasTranslate = null

        this.touchGestureInfo.mainScale = null

        this.stopManipulatingCanvas()
        
        this.brushCursor.hide()
        this.brushCursor.handleToolChanged(this.currentTool)
        this.setCursorStyleFromTool(this.currentTool)
    }
    getMainScale() {
        const container = this.canvasTransformContainer
        const rect = container.getBoundingClientRect()

        return rect.width / (container.offsetWidth * this.currentScale)
    }
    scaleCanvasAroundTouchGesture() {
        const initialDistance = this.touchGestureInfo.initialDistance
        const currentDistance = this.touchGestureInfo.currentDistance

        const initialMidpoint = this.touchGestureInfo.initialMidpoint
        const currentMidpoint = this.touchGestureInfo.currentMidpoint
        const initialCanvasMidpoint = this.touchGestureInfo.initialCanvasMidpoint

        const initialCanvasScale = this.touchGestureInfo.initialCanvasScale
        const initialCanvasTranslate = this.touchGestureInfo.initialCanvasTranslate

        const newScale = clamp(
            initialCanvasScale * (currentDistance / initialDistance),
            this.MIN_ZOOM,
            this.MAX_ZOOM
        )
        
        const newTranslate = this.computeTranslateForScalingAroundPoint(
            initialCanvasScale, 
            initialCanvasTranslate, 
            newScale, 
            initialCanvasMidpoint
        )

        const midpointDiff = [
            currentMidpoint[0] - initialMidpoint[0],
            currentMidpoint[1] - initialMidpoint[1],
        ]
        
        newTranslate[0] += midpointDiff[0] / this.touchGestureInfo.mainScale
        newTranslate[1] += midpointDiff[1] / this.touchGestureInfo.mainScale

        this.currentScale = newScale
        this.currentTranslate = newTranslate
    }

    scaleCanvasAroundMouse(delta, canvasPosition) {
        const scalePerTick = 0.2 / 100
        const change = scalePerTick * -delta
        const newScale = clamp(
            this.currentScale + this.currentScale * change,
            this.MIN_ZOOM,
            this.MAX_ZOOM
        )

        // console.log(newScale)

        this.scaleCanvasAroundPoint(newScale, [canvasPosition.x, canvasPosition.y])
    }

    startMousePan(event) {
        this.mousePanInfo.initialPosition = [event.clientX, event.clientY]
        this.mousePanInfo.initialCanvasTranslate = this.currentTranslate
        this.mousePanInfo.mainScale = this.getMainScale()

        this.brushCursor.disable()
        this.setCursorStyle('move')
        this.startManipulatingCanvas()
    }
    updateMousePan(event) {
        this.mousePanInfo.currentPosition = [event.clientX, event.clientY]
        const pan = [
            this.mousePanInfo.currentPosition[0] - this.mousePanInfo.initialPosition[0],
            this.mousePanInfo.currentPosition[1] - this.mousePanInfo.initialPosition[1],
        ]
        
        this.currentTranslate = [
            this.mousePanInfo.initialCanvasTranslate[0] + pan[0] / this.mousePanInfo.mainScale,
            this.mousePanInfo.initialCanvasTranslate[1] + pan[1] / this.mousePanInfo.mainScale,
        ]
    }
    endMousePan() {
        this.mousePanInfo.initialPosition = null
        this.mousePanInfo.currentPosition = null
        this.mousePanInfo.initialCanvasTranslate = null
        this.mousePanInfo.mainScale = null
        
        this.brushCursor.handleToolChanged(this.currentTool)
        this.brushCursor.hide()
        this.setCursorStyleFromTool(this.currentTool)
        this.stopManipulatingCanvas()
    }

    startManipulatingCanvas() {
        // console.log('started manipulating canvas')        
        this.isManipulatingCanvas = true
    }
    stopManipulatingCanvas() {
        // console.log('stopped manipulating canvas')
        this.isManipulatingCanvas = false
    }

    undo() {
        this.stopDrawing()
        const state = this.history.undo()

        // console.log(state)

        if (state) {
            this.canvas.imageData = state
            this.canvas.updateCanvas()
        }
    }
    redo() {
        this.stopDrawing()
        const state = this.history.redo()

        // console.log(state)

        if (state) {
            this.canvas.imageData = state
            this.canvas.updateCanvas()
        }
    }

    convertToCanvasSpace(position) {
        return convertRawPositionToElementSpace(position, this.canvas.canvas)
    }
    getEventPositionInCanvasSpace(event) {
        return convertEventPositionToElementSpace(event, this.canvas.canvas)
    }
}