const form = document.getElementById('signinForm')

form.addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(form)
    const password = formData.get('password')

    const body = {
        password
    }

    fetch('/api/admin/signin', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'content-type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(result => {
            if(result.code) {
                form.reset()
                window.location.href = `/admin/panel/${result.code}`
            } else {
                alert(result.message)
                document.querySelector('#password').value = ''
            }
        })
})
