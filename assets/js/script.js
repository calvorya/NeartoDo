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
class TaskSync extends TaskList {
    constructor() {
        super();
        this.isBluetoothSupported = 'bluetooth' in navigator;
    }

    async sync() {
        if (!this.isBluetoothSupported) {
            alert('Web Bluetooth is not supported');
            throw new Error('Web Bluetooth is not supported');
        }

        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['send-data'] }],
                optionalServices: ['send-data']
            });
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('send-data');
            const characteristic = await service.getCharacteristic('task-characteristic');
            const value = await characteristic.readValue();
            const receivedData = new TextDecoder().decode(value);
            this.updateTasksFromBluetooth(receivedData);
        } catch (error) {
            alert(`Failed to sync tasks: ${error.message}`);
            throw new Error(`Failed to sync tasks: ${error.message}`);
        }
    }

    updateTasksFromBluetooth(data) {
        try {
            if (!data) {
                throw new Error('No data received');
            }
            const receivedTasks = JSON.parse(data);
            if (!Array.isArray(receivedTasks)) {
                throw new Error('Received data is not an array');
            }
            this.tasks = receivedTasks.map(task => {
                if (!task.title) {
                    throw new Error('Task missing title');
                }
                return new Task(task.title, !!task.completed);
            });
            if (typeof taskViewClass?.renderTask === 'function') {
                taskViewClass.renderTask();
            }
        } catch (error) {
            throw new Error(`Task update failed: ${error.message}`);
        }
    }

    async sendTasksToBluetooth(tasks) {
        if (!this.isBluetoothSupported) {
            throw new Error('Web Bluetooth is not supported');
        }

        try {
            if (!Array.isArray(tasks)) {
                throw new Error('Tasks must be an array');
            }
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['send-data'] }],
                optionalServices: ['send-data']
            });
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('send-data');
            const characteristic = await service.getCharacteristic('task-characteristic');
            const data = JSON.stringify(tasks);
            const encoder = new TextEncoder();
            await characteristic.writeValue(encoder.encode(data));
        } catch (error) {
            throw new Error(`Failed to send tasks: ${error.message}`);
        }
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
