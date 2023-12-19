document.addEventListener('DOMContentLoaded', function() {
    const taskForm = document.getElementById('task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDescriptionInput = document.getElementById('task-description');
    const taskDateInput = document.getElementById('task-date');
    const taskOwnerInput = document.getElementById('task-owner');
    const taskList = document.getElementById('task-list');

    fetch('/users')
    .then(response => response.json())
    .then(users => {
        const taskOwnerSelect = document.getElementById('task-owner');
        // Adiciona uma opção vazia no início
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = 'Selecione um usuário';
        defaultOption.selected = true;
        defaultOption.disabled = true;
        taskOwnerSelect.appendChild(defaultOption);
        // Adiciona as opções para os usuários
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.Nome;
            option.text = user.Nome;
            taskOwnerSelect.appendChild(option);
        });
    })
    .catch(error => console.error('Erro ao buscar usuários:', error));

    taskForm.addEventListener('submit', function(event) {
        event.preventDefault();
        addTask();


});

    function addTask() {
        const title = taskTitleInput.value;
        const description = taskDescriptionInput.value;
        const completionDate = taskDateInput.value;
        const ownerName = taskOwnerInput.value;
    
        fetch('/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, description, completionDate, ownerName }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.TaskID) {
                // Atualiza a interface do usuário com o bloco da tarefa
                const taskItem = listTasks(data);
                taskList.appendChild(taskItem);
            } else {
                alert('Proprietário não encontrado ou erro ao adicionar tarefa.');
            }
            taskTitleInput.value = '';
            taskDescriptionInput.value = '';
            taskDateInput.value = '';
            taskOwnerInput.value = '';
        })
        .catch(error => console.error('Erro ao adicionar tarefa:', error));
    }
    

    function editTask(taskId) {
        const title = prompt('Digite o novo título da tarefa:');
        const description = prompt('Digite a nova descrição da tarefa:');
        const completionDate = prompt('Digite a nova data de conclusão da tarefa (AAAA-MM-DD):');

        fetch(`/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, description, completionDate }),
        })
        .then(response => response.json())
        .then(data => {
            listTasks();
        })
        .catch(error => console.error('Erro ao editar tarefa:', error));
    }

    function deleteTask(taskId) {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            fetch(`/tasks/${taskId}`, {
                method: 'DELETE',
            })
            .then(response => {
                if (response.ok) {
                    listTasks();
                }
            })
            .catch(error => console.error('Erro ao excluir tarefa:', error));
        }
    }

    function listTasks() {
        fetch('/tasks')
        .then(response => response.json())
        .then(tasks => {
            taskList.innerHTML = '';
            tasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                taskItem.innerHTML = `
                    <div class="task-content">
                        <strong>${task.Título}</strong>
                        <p>${task.Descrição}</p>
                        <small>Data de conclusão: ${task.DataDeConclusão}</small>
                    </div>
                    <div class="task-actions">
                        <button class="btn-edit">Editar</button>
                        <button class="btn-delete">Excluir</button>
                    </div>
                `;
                taskList.appendChild(taskItem);
    
                // Adiciona event listeners aos botões
                const btnEdit = taskItem.querySelector('.btn-edit');
                const btnDelete = taskItem.querySelector('.btn-delete');
    
                btnEdit.addEventListener('click', function() {
                    editTask(task.TaskID);
                });
    
                btnDelete.addEventListener('click', function() {
                    deleteTask(task.TaskID);
                });
            });
        })
        .catch(error => console.error('Erro ao listar tarefas:', error));
    }
    
    

    listTasks(); // Chama listTasks ao carregar a página para listar as tarefas existentes
});
