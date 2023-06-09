const {ipcRenderer} = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const $btn = document.querySelector('button'),
        $parsingProgress = document.querySelector('#parsing-progress'),
        $alert = document.querySelector('#alert')

    document.querySelector('#parsing-form')
        .addEventListener('submit', e => {
            e.preventDefault()

            $parsingProgress.innerHTML = ''
            $alert.classList.add('d-none')

            $btn.querySelector('#btn-loader').classList.toggle('d-none')
            $btn.setAttribute('disabled', 'disabled')
            $btn.querySelector('#btn-text').classList.toggle('d-none')

            const input = document.querySelector('#name'),
             startPage = document.querySelector('#startPage'),
             lastPage = document.querySelector('#lastPage')

            ipcRenderer.send('onParsing', {
                search: input.value,
                startPage: startPage.value,
                lastPage: lastPage.value
            })

            input.value = ''
        })

    ipcRenderer.on('parsingProgress', (e, anime) => {
        console.log('anime', anime)
        $parsingProgress.innerHTML += `<li class="list-group-item">#${anime.insert} Name: ${anime.name} Video: ${anime.videosrc}</li>`
    })

    ipcRenderer.on('onParsingEnd', (e, payload) => {
        $btn.querySelector('#btn-loader').classList.toggle('d-none')
        $btn.removeAttribute('disabled')
        $btn.querySelector('#btn-text').classList.toggle('d-none')

        $alert.classList.remove('d-none')
        $alert.innerText = `${payload.message}, Кол-во ${payload.count}`
    })
})
