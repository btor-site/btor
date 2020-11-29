const password = document.getElementById('password')
const deleteForm = document.querySelector('.deleteForm')
const editForm = document.querySelector('.editForm')
const userIdForm = document.querySelector('.userIdForm')
const userIDField = document.getElementById('userID')
const copyId = document.getElementById('copyId')
new ClipboardJS('.userIDbtn');

deleteForm.addEventListener('submit', (event) => {
    event.preventDefault()
    if(!password.value) return alert('Passowrd')
    const formData = new FormData(deleteForm)
    const id = formData.get('id')
    const type = formData.get('type')

    fetch(`/api/admin/delete/${type}/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': password.value
        }
    })
        .then(response => response.json())
        .then(result => {
            if(result.success) {
                deleteForm.reset()
            }
            alert(result.message)
        })
})

editForm.addEventListener('submit', (event) => {
    event.preventDefault()
    if(!password.value) return alert('Pasword')
    const formData = new FormData(editForm)
    const id = formData.get('id')
    const newContent = formData.get('newContent')
    const type = formData.get('type')

    const body = {
        new: newContent
    }

    fetch(`/api/admin/edit/${type}/${id}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Authorization': password.value,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(result => {
            if(result.success) {
                editForm.reset()
            }
            alert(result.message)
        })
})

userIdForm.addEventListener('submit', (event) => {
    event.preventDefault()
    if(!password.value) return alert('Password')
    const formData = new FormData(userIdForm)
    const name = formData.get('name')

    fetch(`/api/admin/id/${name}`, {
        headers: {
            'Authorization': password.value
        }
    })
        .then(response => response.json())
        .then(result => {
            userIDField.value = result.id
            copyId.hidden = false
            userIdForm.reset()
        })
})

function table() {
    fetch('/api/admin/users/all', {
        headers: {
            'Authorization': password.value
        }
    })
        .then(response => response.json())
        .then(result => {
            $('.userTable').htmlson({
                data: result,
                headers: {
                    0: 'Username',
                    1: 'ID',
                    2: 'Token'
                }
            });
        })
}

function show(pg) {
    if(pg === '.page2' && !password.value) return alert('password')
    if(pg === '.page2') table()
    document.querySelector('.page1').hidden = true
    document.querySelector('.page2').hidden = true
    document.querySelector('.page3').hidden = true
    document.querySelector('.page4').hidden = true
    document.querySelector(pg).hidden = false
}