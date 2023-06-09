const {app, BrowserWindow, ipcMain, net} = require('electron')
const path = require('path')
const {parse} = require('node-html-parser');

let mainWindow
const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

const request = (url, callback) => {
    const res = net.request(url)

    res.on('response', response => {
        const data = []
        response.on('data', (chunk) => {
            data.push(chunk)
        })

        response.on('end', () => {
            const result = Buffer.concat(data).toString()

            callback(result)
        })
    })

    res.end()
}

ipcMain.on('onParsing', (event, payload) => {
    parsingAnime(payload)
})

const defaultPayload = {
    startPage: 1,
    lastPage: 999999,
    insert: 0
}

const parsingAnime = (payload) => {
    let {
        search,
        startPage,
        lastPage,
        insert
    } = {...defaultPayload, ...payload}

    request(`https://mix.tj/index.php?do=poisk&s=${search}&st=0&sd=0&sc=0&page=${startPage}`, async result => {
        const root = parse(result)

        const elements = root.querySelectorAll('.block-wrap article')

        if (!elements.length) {
            mainWindow.webContents.send('onParsingEnd', {
                message: insert === 0
                    ? `По вашему ${search} ничего не найдено`
                    : 'Парсинг успешно закончен',
                count: insert
            })

            return;
        }

        let data = {
            success: true
        }

        for (const key in elements) {
            const element = elements[key]

            const anime = {
                link: element.querySelector('a').getAttribute('href'),
                kalbasa: true,

            }

            const res = await net.fetch(`https://mix.tj${anime.link}`)

            const result = await res.text()

            const root = parse(result)
            anime.name = root.querySelector('h1').innerText
            anime.videosrc = root.querySelector('source').getAttribute('src')
            anime.other = root.querySelector('.autoplay-group').innerText
            anime.insert = insert

            data = await storeData(anime)

            mainWindow.webContents.send('parsingProgress', anime)

            if (!data.success) break;

            insert++
        }

        if (!data.success) {
            mainWindow.webContents.send('onParsingEnd', {
                message: 'Парсинг успешно закончен',
                count: insert
            })

            return;
        }

        const pagination = root.querySelector('.page-navigation')

        if (pagination && lastPage > startPage) {
            parsingAnime({
                ...payload,
                ...{
                    startPage: Number(startPage) + 1,
                    insert: insert
                }
            })
        } else {
            mainWindow.webContents.send('onParsingEnd', {
                message: 'Парсинг успешно закончен',
                count: insert
            })
        }

    })
}

const storeData = async anime => {
    const res = await net.fetch(`http://api.animehub.tj/parsing?${new URLSearchParams(anime).toString()}`, {
        method: 'get',
        headers: {
            'accept': 'application/json'
        },
    })

    return await res.json()
}