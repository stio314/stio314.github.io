import { PAINT_TOOL_NAMES } from './paint.js'
import { Event, MessageBroadcaster, MessageReceiver } from './message.js'
import { EventHandler } from './eventhandler.js'
import { hexToRgb, mobileDebugLog, rgbToHex } from './util.js'

function setHoldEventRepeating(element, params, fn) {
    let timeout = null
    let interval = null

    element.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        
        timeout = setTimeout(() => {
            interval = setInterval(fn, params.repeatInterval)
        }, params.delay)
    })

    element.addEventListener('pointerup', (e) => {
        e.preventDefault()

        clearTimeout(timeout)
        clearInterval(interval)
    })
    element.addEventListener('pointerleave', () => {
        clearTimeout(timeout)
        clearInterval(interval)
    })

    element.addEventListener('contextmenu', (e) => {
        e.preventDefault()
    })
}

class Tooltip {
    constructor(element) {
        this.element = element
        this.timeout = null
    }

    update() {
        console.log('generic tooltip update')
    }    

    popup() {
        this.element.classList.remove('hidden')

        if (this.timeout) clearTimeout(this.timeout)
        this.timeout = setTimeout(() => {
            this.element.classList.add('hidden')
        }, 500)
    }

    show() {
        if (this.timeout) clearTimeout(this.timeout)
        this.element.classList.remove('hidden')
    }

    hide() {
        if (this.timeout) clearTimeout(this.timeout)
        this.element.classList.add('hidden')
    }
}

class BrushSizeDisplay extends Tooltip {
    constructor(element, sliderWidth, sliderMinValue, sliderMaxValue) {
        super(element)

        this.sliderWidth = sliderWidth
        this.sliderMinValue = sliderMinValue
        this.sliderMaxValue = sliderMaxValue
    }

    update(brushSize) {
        let position = (brushSize - this.sliderMinValue) / (this.sliderMaxValue - this.sliderMinValue)
        let translate = (position * (this.sliderWidth - 16)) + 8 // sure
        
        this.element.innerText = brushSize + 'px'
        this.element.style.transform = `translateX(calc(-50% + ${Math.floor(translate)}px))`

        this.popup()
    }
}

class ToolDisplay extends Tooltip {
    constructor(element) {
        super(element)
    }

    update(tool, element) {
        const translateX = element.offsetLeft + element.offsetWidth / 2
        const translateY = element.offsetTop + element.offsetHeight / 2
        
        this.element.innerText = PAINT_TOOL_NAMES[tool]
        this.element.style.transform = `translateX(calc(-50% + ${Math.floor(translateX)}px)) translateY(calc(-50% + ${Math.floor(translateY)}px))`
    }
}

class ToolboxKeyboardHandler {
    constructor(messageBroadcaster) {
        this.ctrlDown = false
        this.shiftDown = false

        this.messageBroadcaster = messageBroadcaster

        window.addEventListener('keydown', (e) => this.handleKeyDown(e))
        window.addEventListener('keyup', (e) => this.handleKeyUp(e))
    }

    reservedKeys = ['Control', 'Shift']
    reservedCodes = ['KeyB', 'KeyF', 'KeyR', 'KeyI', 'BracketLeft', 'BracketRight', 'KeyX', 'KeyZ', 'KeyY', 'Equal', 'Minus']

    handleKeyDown(event) {
        // if (event.code != 'Tab' && event.code != 'Enter') event.preventDefault()
        if (this.reservedCodes.includes(event.code) || this.reservedKeys.includes(event.key)) event.preventDefault()

        if (event.key === 'Control') this.ctrlDown = true
        if (event.key === 'Shift') this.shiftDown = true

        if (event.code === 'KeyB')  
            this.messageBroadcaster.notify(this, new Event('userChangedTool', { tool: 'brush' }))
        if (event.code === 'KeyF')
            this.messageBroadcaster.notify(this, new Event('userChangedTool', { tool: 'fill' }))
        if (event.code === 'KeyR')
            this.messageBroadcaster.notify(this, new Event('userChangedTool', { tool: 'replace' }))
        if (event.code === 'KeyI')
            this.messageBroadcaster.notify(this, new Event('userChangedTool', { tool: 'colorpicker' }))

        if (event.code === 'BracketLeft')             
            this.messageBroadcaster.notify(this, new Event('userRequestedBrushSizeSubtract', {}))
        if (event.code === 'BracketRight')
            this.messageBroadcaster.notify(this, new Event('userRequestedBrushSizeAdd', {}))

        if (event.code === 'KeyX')
            this.messageBroadcaster.notify(this, new Event('userRequestedSwapColors', {}))

        if (event.code === 'KeyZ' && this.ctrlDown && !this.shiftDown)
            this.messageBroadcaster.notify(this, new Event('userRequestedUndo', {}))
        if (
            event.code === 'KeyY' && this.ctrlDown ||
            event.code === 'KeyZ' && this.ctrlDown && this.shiftDown
        ) 
            this.messageBroadcaster.notify(this, new Event('userRequestedRedo', {}))

        if (event.code === 'Equal')
            this.messageBroadcaster.notify(this, new Event('userRequestedZoomIn', {}))  
        if (event.code === 'Minus')
            this.messageBroadcaster.notify(this, new Event('userRequestedZoomOut', {}))                
    }
    handleKeyUp(event) {
        if (this.reservedCodes.includes(event.code) || this.reservedKeys.includes(event.key)) event.preventDefault()

        if (event.key === 'Control') this.ctrlDown = false
        if (event.key === 'Shift') this.shiftDown = false
    }
}

export class Toolbox {
    elements = {}

    addEventHandlers() {
        this.eventHandler.add('toolChanged', (_, event) => {
            const selectedToolElement = this.elements.tools[event.args.tool]
            if (!selectedToolElement) return

            for (let tool in this.elements.tools) {
                this.elements.tools[tool].classList.remove('active')
            }
            
            selectedToolElement.classList.add('active')

            this.elements.toolDisplay.update(event.args.tool, this.elements.tools[event.args.tool])
            this.elements.toolDisplay.popup()
        })

        this.eventHandler.add('brushSizeChanged', (_, event) => {
            this.elements.brushSize.value = event.args.brushSize
            this.elements.brushSizeDisplay.update(event.args.brushSize)
        })

        this.eventHandler.add('primaryColorChanged', (_, event) => {
            this.elements.primaryColorDisplay.style.backgroundColor = rgbToHex(...event.args.color)
            this.elements.primaryColorInput.value = rgbToHex(...event.args.color)
        })
        this.eventHandler.add('secondaryColorChanged', (_, event) => {
            this.elements.secondaryColorDisplay.style.backgroundColor = rgbToHex(...event.args.color)
            this.elements.secondaryColorInput.value = rgbToHex(...event.args.color)
        })
    }

    constructor(elements) {
        this.elements.fullscreen = elements.fullscreen

        this.elements.tools = elements.tools // object: { <toolname>: <element> }
        this.elements.toolDisplay = new ToolDisplay(elements.toolDisplay)

        this.elements.brushSize = elements.brushSize // brush size slider
        this.elements.brushSizeDisplay = new BrushSizeDisplay(
            elements.brushSizeDisplay, 
            elements.brushSize.getBoundingClientRect().width,
            parseInt(elements.brushSize.getAttribute('min')),
            parseInt(elements.brushSize.getAttribute('max')),
        )
        this.elements.brushSmall = elements.brushSmall // brush size small button
        this.elements.brushMedium = elements.brushMedium // brush size medium button
        this.elements.brushLarge = elements.brushLarge // brush size large button
        this.elements.brushSubtract = elements.brushSubtract
        this.elements.brushAdd = elements.brushAdd

        this.elements.undo = elements.undo // undo button
        this.elements.redo = elements.redo // redo button
        this.elements.zoomOut = elements.zoomOut // reset transform button
        this.elements.zoomIn = elements.zoomIn // reset transform button
        this.elements.resetTransform = elements.resetTransform // reset transform button

        this.elements.primaryColorDisplay = elements.primaryColorDisplay // primary color visual display
        this.elements.secondaryColorDisplay = elements.secondaryColorDisplay // secondary color visual display
        this.elements.primaryColorInput = elements.primaryColorInput // primary color input
        this.elements.secondaryColorInput = elements.secondaryColorInput // secondary color input
        this.elements.swapColors = elements.swapColors // color swap button

        this.eventHandler = new EventHandler(this, 'Toolbox')
        this.addEventHandlers()

        this.messageBroadcaster = new MessageBroadcaster(this)
        this.messageReceiver = new MessageReceiver(this)

        this.keyboardHandler = new ToolboxKeyboardHandler(this.messageBroadcaster)

        this.setupUserInteractions()
    }

    setupFullscreenUserInteractions() {
        this.elements.fullscreen.addEventListener('click', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen()
                this.elements.fullscreen.classList.remove('active')
            } else {
                document.documentElement.requestFullscreen()
                this.elements.fullscreen.classList.add('active')
            }
        })
    }

    setupToolUserInteractions() {
        for (let tool in this.elements.tools) {
            let toolElement = this.elements.tools[tool]

            toolElement.addEventListener('click', () => {
                this.messageBroadcaster.notify(
                    this, 
                    new Event('userChangedTool', { tool: tool })
                )
            })

            toolElement.addEventListener('pointerenter', () => {
                this.elements.toolDisplay.update(tool, toolElement)
                this.elements.toolDisplay.show()
            })
            toolElement.addEventListener('pointerleave', () => {
                this.elements.toolDisplay.hide()
            })
        }
    }

    setupBrushSizeUserInteractions() {
        // slider
        this.elements.brushSize.addEventListener('input', () => {
            this.messageBroadcaster.notify(
                this, 
                new Event('userChangedBrushSize', { brushSize: parseInt(this.elements.brushSize.value) })
            )
        })

        // small preset
        this.elements.brushSmall.addEventListener('click', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userChangedBrushSize', { brushSize: 1 })
            )
        })

        // medium preset
        this.elements.brushMedium.addEventListener('click', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userChangedBrushSize', { brushSize: 15 })
            )
        })

        // large preset
        this.elements.brushLarge.addEventListener('click', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userChangedBrushSize', { brushSize: 50 })
            )
        })

        this.elements.brushSubtract.addEventListener('pointerdown', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userRequestedBrushSizeSubtract', {})
            )
        })
        setHoldEventRepeating(
            this.elements.brushSubtract, 
            { delay: 500, repeatInterval: 25 },
            () => {
                this.messageBroadcaster.notify(
                    this,
                    new Event('userRequestedBrushSizeSubtract', {})
                )
            }
        )

        this.elements.brushAdd.addEventListener('pointerdown', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userRequestedBrushSizeAdd', {})
            )
        })
        setHoldEventRepeating(
            this.elements.brushAdd, 
            { delay: 500, repeatInterval: 25 },
            () => {
                this.messageBroadcaster.notify(
                    this,
                    new Event('userRequestedBrushSizeAdd', {})
                )
            }
        )
    }

    setupEditUserInteractions() {
        this.elements.undo.addEventListener('click', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userRequestedUndo', {})
            )
        })
        this.elements.redo.addEventListener('click', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userRequestedRedo', {})
            )
        })

        this.elements.zoomIn.addEventListener('click', () => {
            this.messageBroadcaster.notify(
                this, 
                new Event('userRequestedZoomIn', { fromCenter: true })
            )              
        })
        this.elements.zoomOut.addEventListener('click', () => {
            this.messageBroadcaster.notify(
                this, 
                new Event('userRequestedZoomOut', { fromCenter: true })
            )              
        })

        this.elements.resetTransform.addEventListener('click', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userRequestedResetTransform', {})
            )            
        })
    }

    setupColorUserInteractions() {
        this.elements.primaryColorDisplay.addEventListener('click', () => {
            this.elements.primaryColorInput.click()
            this.elements.primaryColorInput.focus()
        })
        this.elements.secondaryColorDisplay.addEventListener('click', () => {
            this.elements.secondaryColorInput.click()
            this.elements.secondaryColorInput.focus()
        })

        this.elements.primaryColorInput.addEventListener('input', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userChangedPrimaryColor', { color: hexToRgb(this.elements.primaryColorInput.value) })
            )
        })
        this.elements.secondaryColorInput.addEventListener('input', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userChangedSecondaryColor', { color: hexToRgb(this.elements.secondaryColorInput.value) })
            )
        })

        this.elements.swapColors.addEventListener('click', () => {
            this.messageBroadcaster.notify(
                this,
                new Event('userRequestedSwapColors', {})
            )
        })

        // const colorInputs = [this.elements.primaryColorInput, this.elements.secondaryColorInput]
        // colorInputs.forEach((el) => {
        //     el.addEventListener('focus', () => {
        //         this.messageBroadcaster.notify(
        //             this,
        //             new Event('colorInputFocused', {})
        //         )
        //         mobileDebugLog('focused color input')
        //     })
        //     el.addEventListener('blur', () => {
        //         this.messageBroadcaster.notify(
        //             this,
        //             new Event('colorInputBlurred', {})
        //         )
        //         mobileDebugLog('blurred color input')
        //     })
        // })
    }

    setupUserInteractions() {
        this.setupFullscreenUserInteractions()
        this.setupToolUserInteractions()
        this.setupBrushSizeUserInteractions()
        this.setupEditUserInteractions()
        this.setupColorUserInteractions()
    }
}