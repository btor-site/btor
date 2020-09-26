const form = document.getElementById('signinForm')

form.addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(form)
    const username = formData.get('username')
    const password = formData.get('password')

    const body = {
        username,
        password
    }
    console.log(body)

    fetch('/api/users/login', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'content-type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(result => {
            form.reset()
            sessionStorage.setItem('user_id', result.id)
            sessionStorage.setItem('token', result.token)
            window.location.href = '/'
        })
})

if(sessionStorage.getItem('token')) {
    fetch('/api/users/me', {
        method: 'GET',
        headers: {
            'Authorization': sessionStorage.getItem('token')
        }
    })
        .then(response => response.json())
        .then(result => {
            if(!result.username) return sessionStorage.removeItem('token')
            window.location.href = '/'
        })
}