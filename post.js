const url = 'https://stio-webhook-server.onrender.com'

document.querySelector('#submit_question').addEventListener('click', () => {    
    const question = document.querySelector('#question').value

    if (!question) {
        alert('please type something in the box thanks')
        return
    } else {
        document.querySelector('#submit_question').setAttribute('disabled', 'true')
        document.querySelector('#submit_question').innerText = 'sending... (may take a while i have no money)'

        const data = {'question': question}
        const req = new XMLHttpRequest()

        req.open('POST', `${url}/send_question`)
        req.setRequestHeader('Content-Type', 'application/json')

        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                if ((req.status === 0 || (req.status >= 200 && req.status < 400)) && req.response !== '') {
                    document.querySelector('#submit_question').innerText = 'thankks'
                } else {
                    document.querySelector('#submit_question').removeAttribute('disabled')
                    document.querySelector('#submit_question').innerText = 'failed to submit'
                }

                console.log(req.response)
            }
        }

        req.send(JSON.stringify(data))
    }
})

document.querySelector('#submit_art').addEventListener('click', () => {
    const image = document.querySelector('#canvas_static').toDataURL('image/png').split(',')[1]

    document.querySelector('#submit_art').setAttribute('disabled', 'true')
    document.querySelector('#submit_art').innerText = 'sending... (may take a while i have no money)'

    const data = {'image': image}
    const req = new XMLHttpRequest()

    req.open('POST', `${url}/send_art`)
    req.setRequestHeader('Content-Type', 'application/json')

    req.onreadystatechange = () => {
        if (req.readyState === 4) {
            if ((req.status === 0 || (req.status >= 200 && req.status < 400)) && req.response !== '') {
                document.querySelector('#submit_art').innerText = 'thankks'
            } else {
                document.querySelector('#submit_art').removeAttribute('disabled')
                document.querySelector('#submit_art').innerText = 'failed to submit'
            }

            console.log(req.response)
        }
    }

    req.send(JSON.stringify(data))
})
