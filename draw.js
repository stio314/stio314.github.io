const $ = function(el) {
    return document.querySelector(el) 
}

const canvasDynamic = $('#canvas_dynamic')
const ctxDynamic = canvasDynamic.getContext('2d')

const canvasStatic = $('#canvas_static')
const ctxStatic = canvasStatic.getContext('2d')

const Mouse = {x: 0, y: 0, drawing: false}

const Keys = {Control: false}

const lines = []
let redoQueue = []

const currentBrush = { 
    brush: [
        { color: '#000000', size: 4 },
        { color: '#ffffff', size: 30 },
    ],

    current: 0 
}
function brush() {
    return currentBrush.brush[currentBrush.current]
}

ctxDynamic.lineCap = 'round'
ctxDynamic.lineJoin = 'round'

ctxStatic.lineCap = 'round'
ctxStatic.lineJoin = 'round'

ctxStatic.fillStyle = '#fff'
ctxStatic.fillRect(0, 0, 600, 400)

function setColor(color) {
    brush().color = color
    $('#art_color').value = color    
    $('#secondary_color').style.background = currentBrush.brush[1-currentBrush.current].color
}
function setSize(size) {
    size = parseFloat(size)
    if (size < 1) size = 1

    brush().size = size
    $('#art_brush_size').value = size
    $('#art_brush_size_display').innerText = `size: ${size}`
}

function updateDynamic() {  
    ctxDynamic.clearRect(0, 0, 600, 400)

    let line = lines[lines.length-1]

    if (line && Mouse.drawing) {    
        ctxDynamic.strokeStyle = line[0]
        ctxDynamic.lineWidth = line[1]

        ctxDynamic.beginPath()
        for (let i=0; i<line.length; i+=2) {
            if (i==0) {
                ctxDynamic.moveTo(line[i+2], line[i+3])
            } else {
                ctxDynamic.lineTo(line[i+2], line[i+3])
            }
        }
        ctxDynamic.stroke()
    }

    ctxDynamic.strokeStyle = '#aaa'
    ctxDynamic.lineWidth = 1

    ctxDynamic.beginPath()
    ctxDynamic.arc(Mouse.x, Mouse.y, brush().size/2, 0, Math.PI*2)
    ctxDynamic.stroke()
}
function updateStatic() {
    ctxStatic.fillStyle = '#fff'
    ctxStatic.fillRect(0, 0, 600, 400)

    for (let line of lines) {
        ctxStatic.fillStyle = line[0]
        ctxStatic.strokeStyle = line[0]

        ctxStatic.lineWidth = line[1]

        ctxStatic.beginPath()
        for (let i=0; i<line.length; i+=2) {
            if (i==0) ctxStatic.moveTo(line[i+2], line[i+3])
            ctxStatic.lineTo(line[i+2], line[i+3])
        }

        ctxStatic.stroke()
    }
}

function updateRedoButton() {
    if (redoQueue.length !== 0) {
        $('#art_redo').removeAttribute('disabled')
    } else {
        $('#art_redo').setAttribute('disabled', 'true')        
    }
}

function switchBrush() {
    currentBrush.current = 1-currentBrush.current

    setColor( brush().color )
    setSize( brush().size )
}

function brushSizeDown() {
    if (brush().size > 100) {
        setSize( brush().size - 10 )
    } else if (brush().size > 10) {
        setSize( brush().size - 5 )            
    } else {
        setSize( brush().size - 1 )
    }

    updateDynamic()
}
function brushSizeUp() {
    if (brush().size >= 100) {
        setSize( brush().size + 10 )
    } else if (brush().size >= 10) {
        setSize( brush().size + 5 )            
    } else {
        setSize( brush().size + 1 )
    }
    
    updateDynamic()
}

function undo() {
    if (lines.length !== 0) {
        redoQueue.push( lines.pop() )
        Mouse.drawing = false
    }

    updateRedoButton()
    updateStatic()
}
function redo() {
    if (redoQueue.length !== 0) {
        lines.push( redoQueue.pop() )
        Mouse.drawing = false
    }

    if (redoQueue.length !== 0) {
        $('#art_redo').removeAttribute('disabled')
    } else {
        $('#art_redo').setAttribute('disabled', 'true')        
    }

    updateRedoButton()
    updateStatic()
}

function handleMouseDown(e) {
    if (e.target.getAttribute('id') === 'canvas_dynamic') {
        lines.push([brush().color, brush().size, Mouse.x, Mouse.y])
        redoQueue = []

        ctxStatic.strokeStyle = brush().color
        ctxStatic.lineWidth = brush().size

        ctxStatic.moveTo(Mouse.x, Mouse.y)
        ctxStatic.beginPath()
        ctxStatic.lineTo(Mouse.x, Mouse.y)

        Mouse.drawing = true
    }

    updateRedoButton()
    updateDynamic()
}
function handleMouseMove(e) {
    if (Mouse.drawing && lines.length !== 0) {
        ctxStatic.lineTo(Mouse.x, Mouse.y)
        lines[lines.length-1].push(Mouse.x, Mouse.y)
    }

    updateDynamic()
}
function handleMouseUp(e) {    
    if (Mouse.drawing) ctxStatic.stroke()     

    Mouse.drawing = false

    updateDynamic()
}

document.addEventListener('mousedown', e => {
    handleMouseDown(e)
})
document.addEventListener('mousemove', e => {
    let rect = canvasStatic.getBoundingClientRect()
    
    Mouse.x = e.clientX - rect.left
    Mouse.y = e.clientY - rect.top

    handleMouseMove(e)
})
document.addEventListener('mouseup', e => {    
    handleMouseUp(e)
})

canvasDynamic.addEventListener('touchmove', e => {
    e.preventDefault()
    const touches = e.changedTouches

    for (let i=0; i<touches.length; i++) {
        if (touches[i].identifier===0) {
            let rect = canvasStatic.getBoundingClientRect()

            Mouse.x = touches[i].clientX - rect.left
            Mouse.y = touches[i].clientY - rect.top

        }
    }
    
    handleMouseMove(e)
})
canvasDynamic.addEventListener('touchstart', e => {
    e.preventDefault()
    const touches = e.changedTouches

    for (let i=0; i<touches.length; i++) {
        if (touches[i].identifier===0) {
            let rect = canvasStatic.getBoundingClientRect()

            Mouse.x = touches[i].clientX - rect.left
            Mouse.y = touches[i].clientY - rect.top
        }
    }

    handleMouseDown(e)
})
canvasDynamic.addEventListener('touchcancel', e => {
    e.preventDefault()

    handleMouseUp(e)
})
canvasDynamic.addEventListener('touchend', e => {
    e.preventDefault()

    handleMouseUp(e)
})

$('#art_brush_size').addEventListener('input', () => {
    setSize( $('#art_brush_size').value )
})
$('#art_color').addEventListener('input', () => {
    setColor( $('#art_color').value )
})

document.addEventListener('keydown', e => {
    if (e.key === 'Control') {
        Keys.Control = true
    }
    if (e.key === 'Shift') {
        Keys.Shift = true
    }

    if (Keys.Control && e.key === 'z') {
        undo()
    }
    if (Keys.Control && e.key === 'y' || Keys.Control && Keys.Shift && e.key === 'Z') {
        redo()
    }

    if (e.key === 'x') {
        switchBrush()
    }

    if (e.key === '[') {
        brushSizeDown()
    }
    if (e.key === ']') {
        brushSizeUp()
    }
})
document.addEventListener('keyup', e => {
    if (e.key === 'Control') {
        Keys.Control = false
    }
    if (e.key === 'Shift') {
        Keys.Shift = false
    }
})

$('#art_brush_size_down').addEventListener('click', () => {
    brushSizeDown()
})
$('#art_brush_size_up').addEventListener('click', () => {
    brushSizeUp()
})

$('#art_undo').addEventListener('click', () => {
    undo()
})
$('#art_redo').addEventListener('click', () => {
    redo()
})

$('#secondary_color').addEventListener('click', () => {
    switchBrush()
})
