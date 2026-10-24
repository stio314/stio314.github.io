import { EventHandler } from './eventhandler.js'
import { MessageBroadcaster, Event, MessageReceiver } from './message.js'
import { colorsEqual, isSafari } from './util.js'

export class DrawingCanvas {
    constructor(canvas, canvasContainer) {
        this.canvas = canvas
        this.canvasContainer = canvasContainer
        this.ctx = this.canvas.getContext('2d', { alpha: false, willReadFrequently: true })

        this.ctx.fillStyle = '#fff'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        this.rect = this.canvas.getBoundingClientRect()

        this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

        this.inputHandler = new CanvasInputHandler(this.canvas, this.canvasContainer)
    }

    getIndex(x, y) {
        if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) return false
        return y * this.canvas.width * 4 + x * 4
    }

    getPixel(x, y) {
        const startIndex = this.getIndex(x, y)

        if (startIndex === false) return

        return [
            this.imageData.data[startIndex],
            this.imageData.data[startIndex + 1],
            this.imageData.data[startIndex + 2]
        ]
    }
    setPixel(x, y, color) {
        const startIndex = this.getIndex(x, y)

        // console.log(startIndex)

        if (startIndex === false) return

        // console.log(this.imageData)
        this.imageData.data[startIndex] = color[0]
        this.imageData.data[startIndex + 1] = color[1]
        this.imageData.data[startIndex + 2] = color[2]

        // console.log(this.imageData)
    }

    cloneRawImageData() {
        return new Uint8ClampedArray(this.imageData.data)
    }
    updateCanvasFromImageData(imageData) {
        this.imageData = imageData
        this.updateCanvas()
    }
    updateCanvas() {
        this.ctx.putImageData(this.imageData, 0, 0)
    }

    drawHorizontalLine(xStart, xEnd, y, color) {
        for (let x = xStart; x <= xEnd; x++) {
            this.setPixel(x, y, color)
        }
    }    
    drawVerticalLine(x, yStart, yEnd, color) {
        for (let y = yStart; y <= yEnd; y++) {
            this.setPixel(x, y, color)
        }
    }

    drawHorizontalLineReplace(xStart, xEnd, y, oldColor, newColor) {
        for (let x = xStart; x <= xEnd; x++) {
            if (!colorsEqual(this.getPixel(x, y), oldColor)) continue
            this.setPixel(x, y, newColor)
        }
    }    
    drawVerticalLineReplace(x, yStart, yEnd, oldColor, newColor) {
        for (let y = yStart; y <= yEnd; y++) {
            if (!colorsEqual(this.getPixel(x, y), oldColor)) continue
            this.setPixel(x, y, newColor)
        }
    }

    getCirclePoints(x, y, r) {        
        let dx = r
        let dy = 0
        let err = 1 - r

        let points = []

        while (dx >= dy) {
            points.push([x + dx, y + dy])
            points.push([x + dx, y - dy])
            points.push([x + dy, y + dx])
            points.push([x + dy, y - dx])

            dy++

            if (err < 0) {
                err = err + 2 * dy + 1
            } else {
                dx = dx - 1
                err = err + 2 * (dy - dx) + 1
            }
        }

        return points
    }

    drawCircle(x, y, r, color) {
        const points = this.getCirclePoints(x, y, r)

        for (let i = 0; i < points.length; i++) {
            let point = points[i]
            this.drawHorizontalLine(x, point[0], point[1], color)
            this.drawHorizontalLine(x + (x - point[0]), point[0], point[1], color)
        }
    }
    drawCircleReplace(x, y, r, oldColor, newColor) {
        const points = this.getCirclePoints(x, y, r)

        for (let i = 0; i < points.length; i++) {
            let point = points[i]
            this.drawHorizontalLineReplace(x, point[0], point[1], oldColor, newColor)
            this.drawHorizontalLineReplace(x + (x - point[0]), point[0], point[1], oldColor, newColor)
        }
    }

    // old draw line function that draws with circles
    // drawLineCircle(start, end, size, color) {
    //     let spacing = 0
    //     let spacingErr = -size
    //     while (true) {
    //         spacing++
    //         if (err < 0) {
    //             spacingErr = spacingErr + 2 * spacing + 1
    //         } else {
    //             break
    //         }
    //     }
    //     spacing = (spacing - 1) * 2 - 1
    //     console.log(spacing)
    //     // horizontal
    //     if (start[1] === end[1]) {
    //         if (size > 1) {
    //             for (let x = start[0]; x <= end[0]; x += spacing) {
    //                 this.drawCircle(x, start[1], size - 1, color)
    //             }
    //         } else {
    //             this.drawHorizontalLine(start[0], end[0], start[1], color)
    //         }
    //         return
    //     }
    //     // vertical
    //     if (start[0] === end[0]) {            
    //         if (size > 1) {
    //             for (let y = start[1]; y <= end[1]; y += spacing) {
    //                 this.drawCircle(start[0], y, size - 1, color)
    //             }
    //         } else {
    //             this.drawVerticalLine(start[0], start[1], end[1], color)
    //         }
    //         return
    //     }
    //     // other
    //     let xs = start[0]
    //     let ys = start[1]
    //     let xe = end[0]
    //     let ye = end[1]
    //     let thickness = size
    //     // Bresenham's line algorithm
    //     let x0 = Math.floor(xs)
    //     let y0 = Math.floor(ys)
    //     let x1 = Math.floor(xe)
    //     let y1 = Math.floor(ye)
    //     let dx = Math.abs(x1 - x0)
    //     let dy = Math.abs(y1 - y0)
    //     let sx = (x0 < x1) ? 1 : -1
    //     let sy = (y0 < y1) ? 1 : -1
    //     let err = dx - dy
    //     let startOffset = 0
    //     if (thickness % 2 === 0)
    //         startOffset = -(thickness - 1)
    //     else
    //         startOffset = -thickness
    //     let x = x0
    //     let y = y0
    //     while (true) {
    //         // Draw the thickness around the current pixel
    //         for (let i = startOffset; i <= thickness; i++)
    //             for (let j = startOffset; j <= thickness; j++)
    //                 this.setPixel(x + i, y + j, color)
    //         if (x === x1 && y === y1) break
    //         let e2 = err * 2
    //         if (e2 > -dy) {
    //             err -= dy
    //             x += sx
    //         }
    //         if (e2 < dx) {
    //             err += dx
    //             y += sy
    //         }
    //     }
    // }
    getLinePoints(start, end, size) {
        let spacing = 0
        let spacingErr = -size

        if (size !== 1) {
            while (true) {
                spacing++

                if (spacingErr < 0) {
                    spacingErr = spacingErr + 2 * spacing + 1
                } else {
                    break
                }
            }

            spacing = (spacing - 1) * 2 - 1
        } else {
            spacing = 1
        }

        let xs = start[0]
        let xe = end[0]

        let ys = start[1]
        let ye = end[1]

        let thickness = size

        // Bresenham's line algorithm
        let x0 = Math.floor(xs)
        let y0 = Math.floor(ys)
        let x1 = Math.floor(xe)
        let y1 = Math.floor(ye)

        let dx = Math.abs(x1 - x0)
        let dy = Math.abs(y1 - y0)
        let sx = (x0 < x1) ? 1 : -1
        let sy = (y0 < y1) ? 1 : -1
        let err = dx - dy

        let startOffset = 0

        if (thickness % 2 === 0)
            startOffset = -(thickness - 1)

        else
            startOffset = -thickness

        let x = x0
        let y = y0

        let points = []

        let max_depth = 0
        while (true) {
            // Draw the thickness around the current pixel
            points.push([x, y])

            if (x === x1 && y === y1) break

            let e2 = err * 2
            if (e2 > -dy) {
                err -= dy
                x += sx
            }
            if (e2 < dx) {
                err += dx
                y += sy
            }

            max_depth++
            if (max_depth >= 9999) break
        }

        return { points, spacing }
    }

    drawLine(start, end, size, color) {
        const { points, spacing } = this.getLinePoints(start, end, size)

        this.drawCircle(start[0], start[1], size - 1, color)
        for (let i = 0; i < points.length; i += spacing) {
            this.drawCircle(points[i][0], points[i][1], size - 1, color)
        }
        this.drawCircle(end[0], end[1], size - 1, color)
    }
    drawLineReplace(start, end, size, oldColor, newColor) {
        const { points, spacing } = this.getLinePoints(start, end, size)

        this.drawCircleReplace(start[0], start[1], size - 1, oldColor, newColor)
        for (let i = 0; i < points.length; i += spacing) {
            this.drawCircleReplace(points[i][0], points[i][1], size - 1, oldColor, newColor)
        }
        this.drawCircleReplace(end[0], end[1], size - 1, oldColor, newColor)
    }

    floodFill(position, newColor) {
        let x = position[0]
        let y = position[1]

        let w = 600
        let h = 400

        let oldColor = this.getPixel(x, y)
        if (colorsEqual(oldColor, newColor)) return

        const queue = []
        queue.push([x, y])

        let iterations = 0

        while (queue.length > 0 && iterations <= 600 * 400 * 4) {
            const [x, y] = queue.shift()

            if (
                x < 0 || 
                x >= w || 
                y < 0 || 
                y >= h || 
                !colorsEqual(this.getPixel(x, y), oldColor)
            ) continue
            
            this.setPixel(x, y, newColor)

            queue.push([x + 1, y])
            queue.push([x - 1, y])
            queue.push([x, y + 1])
            queue.push([x, y - 1])

            iterations += 4
        }
    }

    drawTestImage() {
        this.ctx.fillStyle = 'black'

        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        
        this.ctx.fillStyle = 'white'

        // this.ctx.fillRect(0, 0, 100, 100)
        // this.ctx.fillRect(200, 200, 100, 100)

        this.ctx.fillRect(100, 100, 1, 1)
        this.ctx.fillRect(200, 100, 1, 1)

        // const image = new Image()
        // image.src = 'test.webp'

        // image.addEventListener('load', () => {
        //     this.ctx.drawImage(image, 0, 0)
        //     this.ctx.drawImage(image, 120, 120)
        // })
    }
}

class CanvasInputHandler {
    eventCache = [] // Thanks mozilla

    addEventHandlers() {
        // unused
    }

    constructor(canvas, canvasContainer) {
        this.canvas = canvas
        this.canvasContainer = canvasContainer

        this.eventHandler = new EventHandler(this, 'CanvasInputHandler')
        this.addEventHandlers()

        this.messageBroadcaster = new MessageBroadcaster(this)
        this.messageReceiver = new MessageReceiver(this)

        this.inTouchGesture = false
        this.inMousePanning = false
        this.inColorInput = false

        this.spaceDown = false

        this.addListeners()
    }

    addListeners() {
        this.canvasContainer.addEventListener('pointerdown', (event) => {
            // event.preventDefault()
            
            // if (document.activeElement) document.activeElement.blur()
            // if (isSafari && this.inColorInput) return
            
            this.eventCache.push(event)

            // if (event.pointerType === 'touch' && this.eventCache.length === 4 && this.inTouchGesture) {
            //     this.eventCache = []
            //     new Event(
            //         'touchGestureEnd',
            //         {}
            //     )
            //     this.inTouchGesture = false
            //     return
            // }

            if (event.pointerType === 'mouse' && event.button === 1 || this.spaceDown) {
                this.messageBroadcaster.notify(
                    this,
                    new Event('mousePanStart', { event: event })
                )
                this.inMousePanning = true
                return
            }

            if (event.pointerType === 'touch' && this.eventCache.length === 2 && !this.inTouchGesture) {
                this.messageBroadcaster.notify(
                    this,
                    new Event(
                        'touchGestureStart', 
                        { points: [this.eventCache[0], this.eventCache[1]] }
                    )
                )
                this.inTouchGesture = true
                return                
            }

            if (this.inTouchGesture && this.eventCache.length === 2) {
                this.messageBroadcaster.notify(
                    this,
                    new Event(
                        'touchGestureRecalibrate',
                        { points: [this.eventCache[0], this.eventCache[1]] }
                    )
                )
                return
            }

            if (this.inTouchGesture && this.eventCache.length > 2) {
                return
            }

            this.messageBroadcaster.notify(
                this,
                new Event('pointerDown', { event: event })
            )

            // console.log(this.eventCache)
        })

        window.addEventListener('pointermove', (event) => {
            const eventIndex = this.eventCache.findIndex(
                (cachedEvent) => cachedEvent.pointerId === event.pointerId,
            )
            if (eventIndex != -1) this.eventCache[eventIndex] = event

            if (this.inMousePanning) {
                this.messageBroadcaster.notify(
                    this,
                    new Event('mousePanMove', { event: event })
                )
                return                
            }

            if (this.inTouchGesture) {
                if (this.eventCache.length === 2) {
                    this.messageBroadcaster.notify(
                        this,
                        new Event(
                            'touchGestureMove', 
                            { points: [this.eventCache[0], this.eventCache[1]] }
                        )
                    )
                }
                return
            }
            
            this.messageBroadcaster.notify(
                this,
                new Event('pointerMove', { event: event })
            )

            // console.log(this.eventCache)
        })

        const upEvents = ['pointerup', 'pointercancel', 'lostpointercapture']
        for (let which of upEvents) {
            window.addEventListener(which, (event) => {
                for (var i = 0; i < this.eventCache.length; i++) {
                    if (this.eventCache[i].pointerId == event.pointerId) {
                        this.eventCache.splice(i, 1)
                        break
                    }
                }

                if (this.inMousePanning) {
                    this.messageBroadcaster.notify(
                        this,
                        new Event('mousePanEnd', { event: event })
                    )
                    this.inMousePanning = false
                    return                
                }

                if (this.inTouchGesture) {
                    if (this.eventCache.length === 0) {
                        this.messageBroadcaster.notify(
                            this,
                            new Event(
                                'touchGestureEnd', 
                                { points: [this.eventCache[0], this.eventCache[1]] }
                            )
                        )          
                        this.inTouchGesture = false          
                    }
                    return
                }

                this.messageBroadcaster.notify(
                    this,
                    new Event('pointerUp', { event: event })
                )

                // console.log(this.eventCache)
            })
        }

        // scroll wheel
        this.canvasContainer.addEventListener('wheel', (event) => {
            this.messageBroadcaster.notify(
                this,
                new Event(
                    'mousewheel',
                    { event: event }
                )
            )
        })

        this.canvasContainer.addEventListener('contextmenu', (event) => {
            event.preventDefault()
        })

        window.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                this.spaceDown = true
                this.messageBroadcaster.notify(
                    this,
                    new Event('userPreparedMousePan', {})
                )
            }
        })
        window.addEventListener('keyup', (event) => {
            if (event.code === 'Space') {
                this.spaceDown = false
                this.messageBroadcaster.notify(
                    this,
                    new Event('userUnpreparedMousePan', {})
                )
            }
        })

        this.canvasContainer.addEventListener('touchstart', (event) => {
            event.preventDefault()
        })
    }
}
