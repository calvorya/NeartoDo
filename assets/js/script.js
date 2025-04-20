document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.querySelector('#add-button');
    const taskInput = document.querySelector('#task-input');
    const taskList = document.querySelector('#task-list');
    const syncBtn = document.querySelector('#sync-btn');

    const taskListClass = new TaskList();
    const taskSyncClass = new TaskSync();
    const taskViewClass = new taskView(taskListClass);

    addButton.addEventListener('click', () => {
        taskListClass.addTask(taskInput.value);
        taskInput.value = '';
        taskViewClass.renderTask();
    });

    syncBtn.addEventListener('click', () => {
        taskSyncClass.sync();
    });

});

class TaskList {
    constructor() {
        this.tasks = [];
    }
    addTask(title) {
        this.tasks.push(new Task(title));
    }
    getTasks() {
        return this.tasks;
    }
    removeTask(index) {
        this.tasks.splice(index, 1);
    }
    clearTasks() {
        this.tasks = [];
    }
}

class Task {
    constructor(title, completed = false) {
        this.title = title;
        this.completed = completed;
    }
    toggleCompleted() {
        this.completed = !this.completed;
    }
}

class TaskSync {
    constructor() {
        this.tasks = [];
    }

    sync() {
        if ('bluetooth' in navigator) {
            console.log('Web Bluetooth is supported!');
            navigator.bluetooth.requestDevice({
                filters: [
                    {
                        services: ['send-data'] 
                    }
                ]
            }).then(device => {
                console.log('Device connected:', device);
                return device.gatt.connect();
            }).then(server => {
                console.log('Connected to Bluetooth device');
                return server.getPrimaryService('send-data');
            }).then(service => {
                console.log('Service found:', service);
                return service.getCharacteristic('task-characteristic'); 
            }).then(characteristic => {
                console.log('Characteristic found:', characteristic);
                return characteristic.readValue();
            }).then(value => {
                const receivedData = new TextDecoder().decode(value);
                console.log('Received data from Bluetooth device:', receivedData);
                this.updateTasksFromBluetooth(receivedData);
            }).catch(error => {
                console.log('Error connecting to Bluetooth device:', error);
            });
        } else {
            console.log('Web Bluetooth is not supported!');
        }
    }
    updateTasksFromBluetooth(data) {
        // Assuming the data is a JSON string of task objects

        const receivedTasks = JSON.parse(data);
        this.tasks = receivedTasks.map(task => new Task(task.title, task.completed));
        taskViewClass.renderTask();
    }

    sendTasksToBluetooth(tasks) {
        const data = JSON.stringify(tasks);
        console.log('Sending data to Bluetooth device:', data);
    }
}

class taskView {
    constructor(taskListClass) {
        this.taskListClass = taskListClass;
    }
    async renderTask() {
        const taskContainer = document.querySelector('#task-list');
        taskContainer.innerHTML = ''; // Clear the previous content
        this.taskListClass.getTasks().forEach((task, index) => {

            const taskItem = document.createElement('div');
            taskItem.classList.add('bg-gray-800', 'p-4', 'rounded-md', "bg-gray-700", 'text-white', 'flex', 'justify-between', 'items-center', "gap-2");
            const taskText = document.createElement('div');
            taskText.innerHTML = task.title;
            taskText.classList.add('text-white');
            if (task.completed) {
                taskItem.classList.add('completed');
            }
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash" style="color: red;"></i>';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', () => {
                this.taskListClass.removeTask(index);
                this.renderTask();
            });

            taskItem.appendChild(taskText);
            taskItem.appendChild(deleteButton);
            taskItem.onclick = (event) => {
                task.toggleCompleted();
                this.renderTask();
            };
            taskContainer.appendChild(taskItem);

        });
    }
}
