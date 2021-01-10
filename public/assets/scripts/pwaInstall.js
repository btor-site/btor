let deferredPrompt
const addBtns = document.querySelectorAll('.add-button')
addBtns.forEach((btn) => {
    btn.style.display = 'none'
})

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    addBtns.forEach((btn) => {
        btn.style.display = 'initial'
    })

    addBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            addBtns.forEach((btn) => {
                btn.style.display = 'none'
            })

            deferredPrompt.prompt()
            deferredPrompt.userChoice.then((choiceResult) => {
                deferredPrompt = null
            })
        })
    })
})