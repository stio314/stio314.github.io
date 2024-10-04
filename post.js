const url = 'https://stio-webhook-server.onrender.com'

document.querySelector('#submit').addEventListener('click', () => {
    const imageData = document.querySelector('#canvas_static').getContext('2d').getImageData(0, 0, 600, 400).data
    let empty = true

    for (let i=0; i<imageData.length; i+=4) {
        if (imageData[i] !== 255 || imageData[i+1] !== 255 || imageData[i+2] !== 255) {
            empty = false
            break
        }
    }

    if ( empty ) {
        return alert('cannot send empty canvas')
    } else {
        const question = document.querySelector('#question').value
        const image = document.querySelector('#canvas_static').toDataURL('image/png').split(',')[1]
        
        document.querySelector('#submit').setAttribute('disabled', 'true')
        document.querySelector('#submit').innerText = 'sending... (may take a while i have no money)'

        const data = {'image': image}
        if (question !== '') data.question = question    

        const req = new XMLHttpRequest()

        req.open('POST', `${url}/send`)
        req.setRequestHeader('Content-Type', 'application/json')

        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                if ((req.status === 0 || (req.status >= 200 && req.status < 400)) && req.response !== '') {
                    document.querySelector('#submit').innerText = 'thankks'
                } else {
                    document.querySelector('#submit').removeAttribute('disabled')
                    document.querySelector('#submit').innerText = 'failed to submit'
                }

                console.log(req.response)
            }
        }

        req.send(JSON.stringify(data))
    }
})
