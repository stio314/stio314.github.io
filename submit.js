const url = 'https://stio-webhook-server.onrender.com'

function successUI() {                
    document.querySelector('.submission-modal .submitting').classList.add('hidden')
    document.querySelector('.submission-modal .success').classList.remove('hidden')
}

function failedUI() {
    document.querySelector('.submission-modal .submitting').classList.add('hidden')
    document.querySelector('.submission-modal .failed').classList.remove('hidden')
}

function resetUI() {
    document.querySelector('.submission-modal .submitting').classList.remove('hidden')
    document.querySelector('.submission-modal .success').classList.add('hidden')
    document.querySelector('.submission-modal .failed').classList.add('hidden')
}

function download(canvas) {
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        link.href = url
        link.download = `your_art_${Date.now()}`

        link.click()

        URL.revokeObjectURL(url)
    }, 'image/png')
}

function isEmptyCanvas(imageData) {
    let empty = true
    for (let i = 0; i < imageData.length; i += 4) {
        if (imageData[i] !== 255 || imageData[i+1] !== 255 || imageData[i+2] !== 255) {
            empty = false
            break
        }
    }    

    return empty
}

function submit(submissionText, submissionImageData, submissionImage) {
    const question = submissionText
    const image = submissionImage

    const data = { image: image }
    if (question !== '') data.question = question

    document.querySelector('.submission-modal').classList.remove('hidden')

    const req = new XMLHttpRequest()

    req.open('POST', `${url}/send`)
    // req.open('POST', `temp`)
    req.setRequestHeader('Content-Type', 'application/json')

    req.onreadystatechange = () => {
        if (req.readyState === 4) {
            if ((req.status >= 200 && req.status < 400) && req.response !== '') {
                successUI()
            } else {
                failedUI()
            }

            console.log(req.response)
        }
    }

    req.send(JSON.stringify(data))
}

export function setupSubmission(canvas, ctx, submissionTextElement, submitButton) {
    submitButton.addEventListener('click', () => {
        const submissionText = submissionTextElement.value.trim()
        const submissionImageData = ctx.getImageData(0, 0, 600, 400).data
        const submissionImage = canvas.toDataURL('image/png').split(',')[1]

        if (isEmptyCanvas(submissionImageData)) return alert('cannot submit empty canvas')

        submit(submissionText, submissionImageData, submissionImage)
    })

    document.querySelector('.download-art').addEventListener('click', () => {
        download(canvas)
    })

    document.querySelectorAll('.close-submission-modal').forEach((el) => {
        el.addEventListener('click', () => {
            document.querySelector('.submission-modal').classList.add('hidden')
            resetUI()
        })
    })
}