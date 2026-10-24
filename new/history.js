export class History {
    MAX_SIZE = 100

    constructor() {
        this.current = -1
        this.stack = []

        // this.debug()
    }

    debug() {        
        this.debugCanvas = document.createElement('canvas')
        this.debugCanvas.classList.add('history-debug')

        this.debugCanvas.width = 600*4
        this.debugCanvas.height = 400
        
        this.debugCtx = this.debugCanvas.getContext('2d')

        this.debugCtx.fillStyle = 'red'
        this.debugCtx.fillRect(0, 0, 100, 100)

        document.body.append(this.debugCanvas)
    }

    updateDebug() {
        for (let i = 0; i < this.stack.length; i++) {
            let imageData = this.stack[i]
            this.debugCtx.putImageData(new ImageData(new Uint8ClampedArray(imageData), 600, 400), i*600, 0)
        }
    }

    push(imageData) {
        if (this.stack.length == this.MAX_SIZE) {
            this.stack.shift()
        } else {
            this.current++
        }

        this.stack.push(imageData)

        // console.log('push', this.stack, this.current)
    }

    undo() {
        this.current = Math.max(0, this.current - 1)

        // console.log('undo', this.stack, this.current)
        return new ImageData(new Uint8ClampedArray(this.stack[this.current]), 600, 400)
    }

    redo() {
        this.current = Math.min(this.stack.length - 1, this.current + 1)

        // console.log('redo', this.stack, this.current)
        return new ImageData(new Uint8ClampedArray(this.stack[this.current]), 600, 400)
    }

    confirm() {       
        this.stack.splice(this.current + 1) 
        // console.log('confirm', this.stack, this.current)    
    }
}
